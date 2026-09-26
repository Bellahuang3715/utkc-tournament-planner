export interface UserInterface {
  id: number;
  created: string;
  name: string;
  email: string;
  account_type?: string;
  phone?: string | null;
  organization?: string | null;
  title?: string | null;
  city?: string | null;
  country?: string | null;
  bio?: string | null;
}

export interface UserBodyInterface {
  name: string;
  email: string;
  phone?: string | null;
  organization?: string | null;
  title?: string | null;
  city?: string | null;
  country?: string | null;
  bio?: string | null;
}

export interface UserToRegisterInterface {
  name: string;
  email: string;
  password: string;
  country: string;
}
