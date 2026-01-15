
// Declaração de tipos globais
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const getEnvVar = (key: string) => {
  try {
    return (import.meta as any).env?.[key] || '';
  } catch {
    return '';
  }
};

const API_KEY = getEnvVar('VITE_GOOGLE_API_KEY');
const CLIENT_ID = getEnvVar('VITE_GOOGLE_CLIENT_ID');

const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

class GoogleDriveService {
  private tokenClient: any;
  private isGapiInitialized = false;
  private cachedFolderId: string | null = null;

  constructor() {
    this.tokenClient = null;
  }

  initClient = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        if (!API_KEY || !CLIENT_ID) {
          console.warn('Modo Edição: Drive desativado (Chaves ausentes)');
          resolve();
          return;
        }

        if (window.gapi) {
          window.gapi.load('client', async () => {
            try {
              // Inicializa o cliente com os docs de descoberta do Drive
              // Se já estiver inicializado por outro serviço, isso adiciona a capacidade do Drive
              await window.gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: DISCOVERY_DOCS,
              });
              
              this.isGapiInitialized = true;

              if (window.google) {
                this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                  client_id: CLIENT_ID,
                  scope: SCOPES,
                  callback: '', // Callback será definido dinamicamente na chamada de Auth
                });
              }
              resolve();
            } catch (error) {
              console.error('Error initializing GAPI Drive client', error);
              resolve();
            }
          });
        } else {
          console.warn("GAPI script not loaded");
          resolve();
        }
      } catch (e) {
        console.error('Erro fatal Drive Service', e);
        resolve();
      }
    });
  };

  handleAuthClick = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        // Tenta reinicializar se falhar
        this.initClient().then(() => {
            if(!this.tokenClient) {
                 reject('Drive não configurado ou bloqueado.');
                 return;
            }
            this.triggerTokenRequest(resolve, reject);
        });
        return;
      }
      this.triggerTokenRequest(resolve, reject);
    });
  };

  private triggerTokenRequest = (resolve: any, reject: any) => {
      this.tokenClient.callback = async (resp: any) => {
        if (resp.error) {
            reject(resp);
        } else {
            resolve();
        }
      };
      
      // Se já existe um token, usa prompt vazio para tentar renovar silenciosamente se possível
      // Se falhar (erro de permissão), o usuário terá que clicar novamente para consentir
      const existingToken = window.gapi.client.getToken();
      this.tokenClient.requestAccessToken({ prompt: existingToken ? '' : 'consent' });
  }

  // Encontra ou cria a pasta 'Comprovantes_CGest'
  private getOrCreateFolder = async (): Promise<string> => {
    // 1. Verifica Cache
    if (this.cachedFolderId) return this.cachedFolderId;

    try {
      const q = "mimeType='application/vnd.google-apps.folder' and name='Comprovantes_CGest' and trashed=false";
      const response = await window.gapi.client.drive.files.list({
        q: q,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (response.result.files && response.result.files.length > 0) {
        this.cachedFolderId = response.result.files[0].id;
        return response.result.files[0].id;
      } else {
        // Criar pasta
        const fileMetadata = {
          'name': 'Comprovantes_CGest',
          'mimeType': 'application/vnd.google-apps.folder'
        };
        const createResponse = await window.gapi.client.drive.files.create({
          resource: fileMetadata,
          fields: 'id'
        });
        this.cachedFolderId = createResponse.result.id;
        return createResponse.result.id;
      }
    } catch (error) {
      console.error("Erro ao buscar/criar pasta", error);
      throw error;
    }
  };

  uploadFile = async (file: File): Promise<string> => {
    // Garante inicialização
    if (!this.isGapiInitialized || !window.gapi || !window.gapi.client) {
       await this.initClient();
    }
    
    // Verifica token
    if (!window.gapi.client.getToken()) {
        await this.handleAuthClick();
    }

    const executeUpload = async () => {
        // 1. Garante a pasta (usa cache se disponível)
        const folderId = await this.getOrCreateFolder();

        // 2. Prepara Upload Multipart
        const metadata = {
            name: `Comprovante_${Date.now()}_${file.name}`,
            parents: [folderId]
        };

        const accessToken = window.gapi.client.getToken().access_token;
        const form = new FormData();
        
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
            method: 'POST',
            headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
            body: form
        });

        if (!res.ok) {
             const errorBody = await res.json();
             throw { status: res.status, ...errorBody };
        }

        const data = await res.json();
        return data.webViewLink; 
    };

    try {
        return await executeUpload();
    } catch (error: any) {
        console.warn("Falha no upload, verificando permissões...", error);
        
        // Verifica se é erro de Auth (401 - Unauthorized, 403 - Forbidden)
        const isAuthError = error.status === 401 || error.status === 403 || error.result?.error?.code === 401;

        if (isAuthError) {
             console.log("Renovando token de acesso para Drive...");
             // Força o prompt de consentimento para garantir o escopo drive.file
             this.tokenClient.requestAccessToken({ prompt: 'consent' }); 
             
             // Aguarda nova tentativa do usuário (não podemos aguardar o callback aqui facilmente sem Promise complexa)
             // Então lançamos erro instruindo o usuário a tentar novamente após o popup
             throw new Error("Permissão necessária. Por favor, autorize o acesso ao Drive na janela pop-up e tente enviar novamente.");
        }
        
        throw error;
    }
  };
}

export const googleDriveService = new GoogleDriveService();
