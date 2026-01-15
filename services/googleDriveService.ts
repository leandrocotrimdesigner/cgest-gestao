
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
              // Verifica se já não foi inicializado pelo Calendar Service para evitar duplicidade crítica
              // Mas garante o carregamento do Discovery do Drive
              await window.gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: DISCOVERY_DOCS,
              });
              
              this.isGapiInitialized = true;

              if (window.google) {
                this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                  client_id: CLIENT_ID,
                  scope: SCOPES,
                  callback: '', // Definido na chamada
                });
              }
              resolve();
            } catch (error) {
              console.error('Error initializing GAPI Drive client', error);
              resolve();
            }
          });
        } else {
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
        reject('Drive não configurado');
        return;
      }
      
      this.tokenClient.callback = async (resp: any) => {
        if (resp.error) reject(resp);
        resolve();
      };

      // Solicita permissão específica para o Drive
      // Se o usuário já deu permissão para o Calendar, o Google gerencia isso (Incremental auth)
      this.tokenClient.requestAccessToken({ prompt: '' });
    });
  };

  // Encontra ou cria a pasta 'Comprovantes_CGest'
  private getOrCreateFolder = async (): Promise<string> => {
    try {
      const q = "mimeType='application/vnd.google-apps.folder' and name='Comprovantes_CGest' and trashed=false";
      const response = await window.gapi.client.drive.files.list({
        q: q,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (response.result.files && response.result.files.length > 0) {
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
        return createResponse.result.id;
      }
    } catch (error) {
      console.error("Erro ao buscar/criar pasta", error);
      throw error;
    }
  };

  uploadFile = async (file: File): Promise<string> => {
    if (!this.isGapiInitialized) {
       await this.initClient();
    }
    
    // Tenta garantir autenticação antes do upload
    if (!window.gapi.client.getToken()) {
        await this.handleAuthClick();
    }

    try {
      const folderId = await this.getOrCreateFolder();

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

      const data = await res.json();
      if (data.error) throw data.error;

      return data.webViewLink; // Retorna o link de visualização
    } catch (error) {
      console.error('Erro no upload', error);
      throw error;
    }
  };
}

export const googleDriveService = new GoogleDriveService();
