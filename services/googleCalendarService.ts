
// Declaração de tipos globais para as bibliotecas do Google carregadas via CDN
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// CORREÇÃO DEFINITIVA: Usando import.meta.env (Padrão Vite)
const API_KEY = (import.meta as any).env.VITE_GOOGLE_API_KEY || '';
const CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || '';

const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';

export interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink: string;
  location?: string;
}

export interface CreateEventDTO {
  summary: string;
  description?: string;
  start: string; // ISO String
  end: string;   // ISO String
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
      // VERIFICAÇÃO DE SEGURANÇA:
      // Se não houver chaves (ambiente de desenvolvimento/editor), não tenta carregar o GAPI.
      // Isso evita a tela branca ou erros de script.
      if (!API_KEY || !CLIENT_ID) {
        console.warn('Google Calendar: Chaves de API não detectadas. O serviço funcionará em modo offline/demonstração.');
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
            // Resolvemos mesmo com erro para não travar a UI, apenas a funcionalidade de calendário falhará
            resolve();
          }
        });
      } else {
        // Se o script não carregou (ex: bloqueador de anúncios ou falha de rede), resolvemos para não travar o app
        console.warn('Google API script not loaded');
        resolve();
      }
    });
  };

  // Solicita login ao usuário
  handleAuthClick = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        // Em vez de rejeitar com erro fatal, apenas alertamos
        console.warn('Token client not initialized. Verifique as chaves de API.');
        reject('Integração com Google não configurada.');
        return;
      }

      this.tokenClient.callback = async (resp: any) => {
        if (resp.error) {
          reject(resp);
        }
        resolve();
      };

      if (window.gapi.client.getToken() === null) {
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        this.tokenClient.requestAccessToken({ prompt: '' });
      }
    });
  };

  // Logout
  handleSignoutClick = () => {
    if (!window.gapi || !window.gapi.client) return;
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

  // Cria evento na agenda
  createEvent = async (eventData: CreateEventDTO): Promise<any> => {
    if (!this.isGapiInitialized || !this.isAuthenticated()) {
      throw new Error("Usuário não autenticado no Google Calendar");
    }

    const event = {
      'summary': eventData.summary,
      'description': eventData.description,
      'start': {
        'dateTime': eventData.start,
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      'end': {
        'dateTime': eventData.end,
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    try {
      const request = await window.gapi.client.calendar.events.insert({
        'calendarId': 'primary',
        'resource': event
      });
      return request;
    } catch (err) {
      console.error('Error creating event', err);
      throw err;
    }
  };
}

export const googleCalendarService = new GoogleCalendarService();
