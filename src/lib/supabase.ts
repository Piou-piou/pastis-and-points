import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
// En local, remplacez '192.168.1.XX' par l'adresse IP de votre ordinateur 
// pour que les téléphones physiques sur le même Wi-Fi puissent se connecter.
const LOCAL_IP = '192.168.1.XX'; 

const isLocal = true; // Passez à false pour la production

const supabaseUrl = isLocal 
  ? `http://${LOCAL_IP}:54321` 
  : 'VOTRE_URL_SUPABASE_PROD';

const supabaseAnonKey = isLocal
  ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBldGFucXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Nzg4MzE5MTgsImV4cCI6MjAwNDQwNzkxOH0.super-secret-anon-key-placeholder'
  : 'VOTRE_ANON_KEY_PROD';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
