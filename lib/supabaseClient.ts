
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase URL and anon key
const supabaseUrl = 'https://pqsiwdomnyxgyriczpqm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxc2l3ZG9tbnl4Z3lyaWN6cHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNDI2ODMsImV4cCI6MjA3MzYxODY4M30.s4NIBghyIvVVM_3W-YRSalHxcXW__KF2TdcD1dJypO4';

// Initialize the client without strict generics to prevent build locking
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
