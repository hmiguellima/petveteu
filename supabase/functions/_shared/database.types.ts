export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      account_roles: {
        Row: {
          created_at: string;
          profile_id: string;
          role: Database['public']['Enums']['user_role'];
        };
        Insert: {
          created_at?: string;
          profile_id: string;
          role: Database['public']['Enums']['user_role'];
        };
        Update: {
          created_at?: string;
          profile_id?: string;
          role?: Database['public']['Enums']['user_role'];
        };
        Relationships: [
          {
            foreignKeyName: 'account_roles_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      admin_audit_events: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          details: Json;
          id: string;
          target_id: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: string;
          target_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: string;
          target_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'admin_audit_events_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      client_settings: {
        Row: {
          created_at: string;
          is_incomplete: boolean;
          legal_hold_until: string | null;
          phone: string | null;
          privacy_notice_presented_at: string | null;
          privacy_notice_version: string | null;
          processing_restricted: boolean;
          profile_id: string;
          sms_enabled_by_client: boolean;
          sms_enabled_by_vet: boolean;
          updated_at: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          is_incomplete?: boolean;
          legal_hold_until?: string | null;
          phone?: string | null;
          privacy_notice_presented_at?: string | null;
          privacy_notice_version?: string | null;
          processing_restricted?: boolean;
          profile_id: string;
          sms_enabled_by_client?: boolean;
          sms_enabled_by_vet?: boolean;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          is_incomplete?: boolean;
          legal_hold_until?: string | null;
          phone?: string | null;
          privacy_notice_presented_at?: string | null;
          privacy_notice_version?: string | null;
          processing_restricted?: boolean;
          profile_id?: string;
          sms_enabled_by_client?: boolean;
          sms_enabled_by_vet?: boolean;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'client_settings_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      data_subject_requests: {
        Row: {
          completed_at: string | null;
          created_at: string;
          decision_code: string | null;
          id: string;
          outcome: string | null;
          profile_id: string;
          request_type: string;
          retention_basis: string | null;
          status: string;
          verified_at: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          decision_code?: string | null;
          id?: string;
          outcome?: string | null;
          profile_id: string;
          request_type: string;
          retention_basis?: string | null;
          status?: string;
          verified_at?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          decision_code?: string | null;
          id?: string;
          outcome?: string | null;
          profile_id?: string;
          request_type?: string;
          retention_basis?: string | null;
          status?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'data_subject_requests_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      in_app_notifications: {
        Row: {
          actor_id: string | null;
          created_at: string;
          event: Database['public']['Enums']['membership_event'];
          id: string;
          read_at: string | null;
          recipient_id: string;
          subject_id: string;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          event: Database['public']['Enums']['membership_event'];
          id?: string;
          read_at?: string | null;
          recipient_id: string;
          subject_id: string;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          event?: Database['public']['Enums']['membership_event'];
          id?: string;
          read_at?: string | null;
          recipient_id?: string;
          subject_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'in_app_notifications_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'in_app_notifications_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'in_app_notifications_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      pets: {
        Row: {
          birth_date_is_estimated: boolean;
          breed: string | null;
          created_at: string;
          date_of_birth: string;
          deleted_at: string | null;
          id: string;
          name: string;
          notification_expiry_years: number;
          other_species: string | null;
          owner_id: string;
          species: Database['public']['Enums']['pet_species'];
          updated_at: string;
          version: number;
        };
        Insert: {
          birth_date_is_estimated?: boolean;
          breed?: string | null;
          created_at?: string;
          date_of_birth: string;
          deleted_at?: string | null;
          id?: string;
          name: string;
          notification_expiry_years: number;
          other_species?: string | null;
          owner_id: string;
          species: Database['public']['Enums']['pet_species'];
          updated_at?: string;
          version?: number;
        };
        Update: {
          birth_date_is_estimated?: boolean;
          breed?: string | null;
          created_at?: string;
          date_of_birth?: string;
          deleted_at?: string | null;
          id?: string;
          name?: string;
          notification_expiry_years?: number;
          other_species?: string | null;
          owner_id?: string;
          species?: Database['public']['Enums']['pet_species'];
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'pets_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          is_incomplete: boolean;
          legal_hold_until: string | null;
          locale: Database['public']['Enums']['app_locale'];
          mfa_required: boolean;
          phone: string | null;
          processing_restricted: boolean;
          role: Database['public']['Enums']['user_role'];
          sms_enabled_by_client: boolean;
          sms_enabled_by_vet: boolean;
          updated_at: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          is_incomplete?: boolean;
          legal_hold_until?: string | null;
          locale?: Database['public']['Enums']['app_locale'];
          mfa_required?: boolean;
          phone?: string | null;
          processing_restricted?: boolean;
          role?: Database['public']['Enums']['user_role'];
          sms_enabled_by_client?: boolean;
          sms_enabled_by_vet?: boolean;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          is_incomplete?: boolean;
          legal_hold_until?: string | null;
          locale?: Database['public']['Enums']['app_locale'];
          mfa_required?: boolean;
          phone?: string | null;
          processing_restricted?: boolean;
          role?: Database['public']['Enums']['user_role'];
          sms_enabled_by_client?: boolean;
          sms_enabled_by_vet?: boolean;
          updated_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      reminder_attempts: {
        Row: {
          created_at: string;
          id: string;
          outcome: Database['public']['Enums']['attempt_outcome'];
          provider_sid: string | null;
          reason_code: string | null;
          reminder_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          outcome: Database['public']['Enums']['attempt_outcome'];
          provider_sid?: string | null;
          reason_code?: string | null;
          reminder_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          outcome?: Database['public']['Enums']['attempt_outcome'];
          provider_sid?: string | null;
          reason_code?: string | null;
          reminder_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reminder_attempts_reminder_id_fkey';
            columns: ['reminder_id'];
            isOneToOne: false;
            referencedRelation: 'reminders';
            referencedColumns: ['id'];
          },
        ];
      };
      reminder_job_runs: {
        Row: {
          business_date: string;
          completed_at: string | null;
          error_code: string | null;
          id: string;
          started_at: string;
          status: Database['public']['Enums']['run_status'];
          trigger_source: string;
        };
        Insert: {
          business_date: string;
          completed_at?: string | null;
          error_code?: string | null;
          id?: string;
          started_at?: string;
          status?: Database['public']['Enums']['run_status'];
          trigger_source: string;
        };
        Update: {
          business_date?: string;
          completed_at?: string | null;
          error_code?: string | null;
          id?: string;
          started_at?: string;
          status?: Database['public']['Enums']['run_status'];
          trigger_source?: string;
        };
        Relationships: [];
      };
      reminders: {
        Row: {
          created_at: string;
          due_date: string;
          id: string;
          status: Database['public']['Enums']['reminder_status'];
          updated_at: string;
          vaccination_entry_id: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          due_date: string;
          id?: string;
          status?: Database['public']['Enums']['reminder_status'];
          updated_at?: string;
          vaccination_entry_id: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          due_date?: string;
          id?: string;
          status?: Database['public']['Enums']['reminder_status'];
          updated_at?: string;
          vaccination_entry_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'reminders_vaccination_entry_id_fkey';
            columns: ['vaccination_entry_id'];
            isOneToOne: false;
            referencedRelation: 'vaccination_entries';
            referencedColumns: ['id'];
          },
        ];
      };
      vaccination_entries: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          due_date: string;
          id: string;
          last_administered_date: string | null;
          notes: string | null;
          pet_id: string;
          updated_at: string;
          vaccine_type: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          due_date: string;
          id?: string;
          last_administered_date?: string | null;
          notes?: string | null;
          pet_id: string;
          updated_at?: string;
          vaccine_type: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          due_date?: string;
          id?: string;
          last_administered_date?: string | null;
          notes?: string | null;
          pet_id?: string;
          updated_at?: string;
          vaccine_type?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'vaccination_entries_pet_id_fkey';
            columns: ['pet_id'];
            isOneToOne: false;
            referencedRelation: 'pets';
            referencedColumns: ['id'];
          },
        ];
      };
      vet_access: {
        Row: {
          activated_at: string | null;
          created_at: string;
          email_locked_at: string;
          profile_id: string;
          status: Database['public']['Enums']['vet_access_status'];
          updated_at: string;
        };
        Insert: {
          activated_at?: string | null;
          created_at?: string;
          email_locked_at?: string;
          profile_id: string;
          status: Database['public']['Enums']['vet_access_status'];
          updated_at?: string;
        };
        Update: {
          activated_at?: string | null;
          created_at?: string;
          email_locked_at?: string;
          profile_id?: string;
          status?: Database['public']['Enums']['vet_access_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vet_access_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      vet_invitations: {
        Row: {
          accepted_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          profile_id: string;
          provider_reference: string | null;
          status: Database['public']['Enums']['vet_invitation_status'];
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by: string;
          profile_id: string;
          provider_reference?: string | null;
          status?: Database['public']['Enums']['vet_invitation_status'];
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          profile_id?: string;
          provider_reference?: string | null;
          status?: Database['public']['Enums']['vet_invitation_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vet_invitations_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vet_invitations_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      activate_my_client_role: {
        Args: { p_notice_version: string };
        Returns: undefined;
      };
      activate_my_vet_access: { Args: never; Returns: undefined };
      apply_approved_retention: {
        Args: {
          p_audit_before: string;
          p_job_run_before: string;
          p_reminder_before: string;
          p_soft_deleted_before: string;
        };
        Returns: Json;
      };
      audit_details_are_safe: { Args: { details: Json }; Returns: boolean };
      client_create_pet: {
        Args: {
          p_birth: string;
          p_breed: string;
          p_estimated: boolean;
          p_name: string;
          p_other_species: string;
          p_species: Database['public']['Enums']['pet_species'];
        };
        Returns: {
          birth_date_is_estimated: boolean;
          breed: string | null;
          created_at: string;
          date_of_birth: string;
          deleted_at: string | null;
          id: string;
          name: string;
          notification_expiry_years: number;
          other_species: string | null;
          owner_id: string;
          species: Database['public']['Enums']['pet_species'];
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: '*';
          to: 'pets';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      client_remove_pet: {
        Args: { p_id: string; p_version: number };
        Returns: undefined;
      };
      client_update_pet: {
        Args: {
          p_birth: string;
          p_breed: string;
          p_estimated: boolean;
          p_id: string;
          p_name: string;
          p_other_species: string;
          p_species: Database['public']['Enums']['pet_species'];
          p_version: number;
        };
        Returns: {
          birth_date_is_estimated: boolean;
          breed: string | null;
          created_at: string;
          date_of_birth: string;
          deleted_at: string | null;
          id: string;
          name: string;
          notification_expiry_years: number;
          other_species: string | null;
          owner_id: string;
          species: Database['public']['Enums']['pet_species'];
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: '*';
          to: 'pets';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      deactivate_my_empty_client_role: { Args: never; Returns: undefined };
      has_role: {
        Args: { p_role: Database['public']['Enums']['user_role'] };
        Returns: boolean;
      };
      is_vet: { Args: never; Returns: boolean };
      mark_notification_read: { Args: { p_id: string }; Returns: undefined };
      update_my_profile: {
        Args: {
          p_full_name: string;
          p_locale: Database['public']['Enums']['app_locale'];
          p_phone: string;
          p_sms: boolean;
          p_version: number;
        };
        Returns: {
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          is_incomplete: boolean;
          legal_hold_until: string | null;
          locale: Database['public']['Enums']['app_locale'];
          mfa_required: boolean;
          phone: string | null;
          processing_restricted: boolean;
          role: Database['public']['Enums']['user_role'];
          sms_enabled_by_client: boolean;
          sms_enabled_by_vet: boolean;
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: '*';
          to: 'profiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      vet_complete_data_subject_request: {
        Args: {
          p_decision_code: string;
          p_request_id: string;
          p_retention_basis_code?: string;
        };
        Returns: {
          completed_at: string | null;
          created_at: string;
          decision_code: string | null;
          id: string;
          outcome: string | null;
          profile_id: string;
          request_type: string;
          retention_basis: string | null;
          status: string;
          verified_at: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'data_subject_requests';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      vet_create_pet: {
        Args: {
          p_birth: string;
          p_breed: string;
          p_estimated: boolean;
          p_expiry?: number;
          p_name: string;
          p_other_species: string;
          p_owner_id: string;
          p_species: Database['public']['Enums']['pet_species'];
        };
        Returns: {
          birth_date_is_estimated: boolean;
          breed: string | null;
          created_at: string;
          date_of_birth: string;
          deleted_at: string | null;
          id: string;
          name: string;
          notification_expiry_years: number;
          other_species: string | null;
          owner_id: string;
          species: Database['public']['Enums']['pet_species'];
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: '*';
          to: 'pets';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      vet_open_data_subject_request: {
        Args: { p_profile_id: string; p_request_type: string };
        Returns: {
          completed_at: string | null;
          created_at: string;
          decision_code: string | null;
          id: string;
          outcome: string | null;
          profile_id: string;
          request_type: string;
          retention_basis: string | null;
          status: string;
          verified_at: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'data_subject_requests';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      vet_remove_pet: {
        Args: { p_id: string; p_version: number };
        Returns: undefined;
      };
      vet_remove_vaccination: {
        Args: { p_id: string; p_version: number };
        Returns: undefined;
      };
      vet_restrict_client_processing: {
        Args: { p_request_id: string; p_restricted: boolean };
        Returns: undefined;
      };
      vet_revoke_role: { Args: { p_profile_id: string }; Returns: undefined };
      vet_save_vaccination: {
        Args: {
          p_admin: string;
          p_due: string;
          p_id: string;
          p_notes: string;
          p_pet_id: string;
          p_type: string;
          p_version: number;
        };
        Returns: {
          created_at: string;
          deleted_at: string | null;
          due_date: string;
          id: string;
          last_administered_date: string | null;
          notes: string | null;
          pet_id: string;
          updated_at: string;
          vaccine_type: string;
          version: number;
        };
        SetofOptions: {
          from: '*';
          to: 'vaccination_entries';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      vet_update_client: {
        Args: {
          p_id: string;
          p_locale: Database['public']['Enums']['app_locale'];
          p_name: string;
          p_phone: string;
          p_sms: boolean;
          p_version: number;
        };
        Returns: {
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          is_incomplete: boolean;
          legal_hold_until: string | null;
          locale: Database['public']['Enums']['app_locale'];
          mfa_required: boolean;
          phone: string | null;
          processing_restricted: boolean;
          role: Database['public']['Enums']['user_role'];
          sms_enabled_by_client: boolean;
          sms_enabled_by_vet: boolean;
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: '*';
          to: 'profiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      vet_update_pet: {
        Args: {
          p_birth: string;
          p_breed: string;
          p_estimated: boolean;
          p_expiry: number;
          p_id: string;
          p_name: string;
          p_other_species: string;
          p_species: Database['public']['Enums']['pet_species'];
          p_version: number;
        };
        Returns: {
          birth_date_is_estimated: boolean;
          breed: string | null;
          created_at: string;
          date_of_birth: string;
          deleted_at: string | null;
          id: string;
          name: string;
          notification_expiry_years: number;
          other_species: string | null;
          owner_id: string;
          species: Database['public']['Enums']['pet_species'];
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: '*';
          to: 'pets';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      vet_verify_data_subject_request: {
        Args: { p_request_id: string };
        Returns: {
          completed_at: string | null;
          created_at: string;
          decision_code: string | null;
          id: string;
          outcome: string | null;
          profile_id: string;
          request_type: string;
          retention_basis: string | null;
          status: string;
          verified_at: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'data_subject_requests';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      app_locale: 'pt-PT' | 'en';
      attempt_outcome: 'dry_run' | 'submitted' | 'transient_failure' | 'permanent_skip';
      membership_event: 'vet_activated' | 'vet_revoked' | 'vet_reinstated';
      pet_species: 'dog' | 'cat' | 'other';
      reminder_status:
        'pending' | 'submitted' | 'delivered' | 'exhausted' | 'cancelled' | 'permanently_skipped';
      run_status: 'running' | 'succeeded' | 'failed';
      user_role: 'client' | 'vet';
      vet_access_status: 'pending_mfa' | 'active';
      vet_invitation_status: 'pending' | 'accepted' | 'cancelled' | 'expired';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_locale: ['pt-PT', 'en'],
      attempt_outcome: ['dry_run', 'submitted', 'transient_failure', 'permanent_skip'],
      membership_event: ['vet_activated', 'vet_revoked', 'vet_reinstated'],
      pet_species: ['dog', 'cat', 'other'],
      reminder_status: [
        'pending',
        'submitted',
        'delivered',
        'exhausted',
        'cancelled',
        'permanently_skipped',
      ],
      run_status: ['running', 'succeeded', 'failed'],
      user_role: ['client', 'vet'],
      vet_access_status: ['pending_mfa', 'active'],
      vet_invitation_status: ['pending', 'accepted', 'cancelled', 'expired'],
    },
  },
} as const;
