
// Declaração de tipos globais para as bibliotecas do Google carregadas via CDN
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// Usando import.meta.env (Padrão Vite) para garantir leitura correta na Vercel
const API_KEY = (import.meta as any).env.VITE_GOOGLE_API_KEY || '';
const CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || '';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
// Atualizado para incluir o escopo mais amplo de leitura
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly';

export interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink: string;
  location?: string;
}

class GoogleCalendarService {
  private tokenClient: any;
  private isGapiInitialized = false;

  constructor() {
    this.tokenClient = null;
  }

  // Inicializa o cliente GAPI
  initClient = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!API_KEY || !CLIENT_ID) {
        console.warn('Google API Key or Client ID missing in env');
        resolve(); 
        return;
      }

      if (window.gapi) {
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({
              apiKey: API_KEY,
              discoveryDocs: DISCOVERY_DOCS,
            });
            this.isGapiInitialized = true;
            
            // Initialize Identity Services
            if (window.google) {
              this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '', // Defined at request time
              });
            }
            
            resolve();
          } catch (error) {
            console.error('Error initializing GAPI client', error);
            reject(error);
          }
        });
      } else {
        reject('Google API script not loaded');
      }
    });
  };

  // Solicita login ao usuário
  handleAuthClick = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        reject('Token client not initialized');
        return;
      }

      // Callback do novo GIS (Google Identity Services)
      this.tokenClient.callback = async (resp: any) => {
        if (resp.error) {
          reject(resp);
        }
        resolve();
      };

      // GIS (google.accounts.oauth2) usa popup por padrão.
      // gapi.auth2.getAuthInstance() não é mais usado com este fluxo.
      // Verificamos se há token válido via gapi.client
      if (window.gapi.client.getToken() === null) {
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        this.tokenClient.requestAccessToken({ prompt: '' });
      }
    });
  };

  // Logout
  handleSignoutClick = () => {
    const token = window.gapi.client.getToken();
    if (token !== null) {
      window.google.accounts.oauth2.revoke(token.access_token);
      window.gapi.client.setToken('');
    }
  };

  // Verifica se está logado
  isAuthenticated = (): boolean => {
    return window.gapi && window.gapi.client && window.gapi.client.getToken() !== null;
  };

  // Busca eventos
  listUpcomingEvents = async (timeMin: Date, timeMax: Date): Promise<GoogleEvent[]> => {
    if (!this.isGapiInitialized) return [];

    try {
      const response = await window.gapi.client.calendar.events.list({
        'calendarId': 'primary',
        'timeMin': timeMin.toISOString(),
        'timeMax': timeMax.toISOString(),
        'showDeleted': false,
        'singleEvents': true,
        'maxResults': 100,
        'orderBy': 'startTime',
      });
      return response.result.items;
    } catch (err) {
      console.error('Error fetching events', err);
      throw err;
    }
  };
}

export const googleCalendarService = new GoogleCalendarService();
