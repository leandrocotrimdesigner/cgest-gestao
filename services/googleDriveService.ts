
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

// ID Fixo da pasta de destino
const TARGET_FOLDER_ID = '1cWSxDO4_U2-nUP-oP5RncVoBMRqJ-l1N';

const DISCOVERY_DOCS: string[] = []; 
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
              if (this.isGapiInitialized) {
                  resolve();
                  return;
              }

              await window.gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: DISCOVERY_DOCS,
              });
              
              this.isGapiInitialized = true;

              if (window.google && !this.tokenClient) {
                this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                  client_id: CLIENT_ID,
                  scope: SCOPES,
                  callback: '', 
                });
              }
              resolve();
            } catch (error: any) {
              console.error('Falha na inicialização do GAPI:', error);
              resolve();
            }
          });
        } else {
          console.warn("Script GAPI não encontrado.");
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
        this.initClient().then(() => {
            if(!this.tokenClient) {
                 reject('Cliente de Autenticação não disponível.');
                 return;
            }
            this.triggerTokenRequest(resolve, reject);
        }).catch(err => reject(err));
        return;
      }
      this.triggerTokenRequest(resolve, reject);
    });
  };

  private triggerTokenRequest = (resolve: any, reject: any) => {
      this.tokenClient.callback = (resp: any) => {
        if (resp.error) {
            console.error("Erro Auth:", resp);
            reject(resp);
        } else {
            resolve();
        }
      };
      
      const existingToken = window.gapi?.client?.getToken();
      this.tokenClient.requestAccessToken({ prompt: existingToken ? '' : 'consent' });
  }

  uploadFile = async (file: File): Promise<string> => {
    if (!this.isGapiInitialized || !window.gapi || !window.gapi.client) {
       await this.initClient();
    }
    
    const token = window.gapi.client.getToken();
    if (!token) {
        await this.handleAuthClick();
    }

    const executeUpload = async () => {
        const metadata = {
            name: `Comprovante_${Date.now()}_${file.name}`,
            parents: [TARGET_FOLDER_ID] 
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
        console.warn("Falha no upload:", error);
        
        const errorCode = error.status || error.code;
        
        if (errorCode === 401 || errorCode === 403 || (error.error?.message && error.error.message.includes('Permission'))) {
             if (this.tokenClient) {
                 this.tokenClient.requestAccessToken({ prompt: 'consent' });
                 throw new Error("Permissão necessária: Por favor, autorize o acesso na janela pop-up e tente enviar novamente.");
             }
        }
        
        if (errorCode === 404) {
            throw new Error("Pasta de destino não encontrada (Erro 404). Verifique se o ID da pasta está correto.");
        }

        throw new Error(`Erro Google Drive: ${error.error?.message || error.message || 'Desconhecido'}`);
    }
  };
}

export const googleDriveService = new GoogleDriveService();
