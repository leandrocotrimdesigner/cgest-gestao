
// Declaração de tipos globais para as bibliotecas do Google carregadas via CDN
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const API_KEY = process.env.VITE_GOOGLE_API_KEY || '';
const CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || '';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/calendar.events.readonly';

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
        // Não rejeitamos aqui para não travar a UI, apenas logamos o aviso
        // O botão de conectar falhará graciosamente se clicado
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

      this.tokenClient.callback = async (resp: any) => {
        if (resp.error) {
          reject(resp);
        }
        resolve();
      };

      if (window.gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent to share their data
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        // Skip display of account chooser and consent dialog for an existing session.
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
