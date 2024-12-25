import { UserBodyInterface } from '../interfaces/user';
import { createAxios, handleRequestError } from './adapter';

export async function updateUser(user_id: number, user: UserBodyInterface) {
  return createAxios()
    .put(`users/${user_id}`, user)
    .catch((response: any) => handleRequestError(response));
}

export async function updatePassword(user_id: number, password: string) {
  return createAxios()
    .put(`users/${user_id}/password`, { password })
    .catch((response: any) => handleRequestError(response));
}

export async function registerDemoUser(captchaToken: string | null) {
  return createAxios()
    .post('users/register_demo', {
      captcha_token: captchaToken,
    })
    .catch((response: any) => handleRequestError(response));
}
