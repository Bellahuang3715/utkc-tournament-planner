import { UserBodyInterface, UserToRegisterInterface } from '../interfaces/user';
import { createAxios, handleRequestError } from './adapter';

export async function updateUser(user_id: number, user: UserBodyInterface) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.put(`users/${user_id}`, user);
  } catch (error: any) {
    return handleRequestError(error);
  }
}

export async function updatePassword(user_id: number, password: string) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.put(`users/${user_id}/password`, { password });
  } catch (error: any) {
    return handleRequestError(error);
  }
}

export async function registerUserDb(user: UserToRegisterInterface, captchaToken: string | null) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.post('users/register', {
      email: user.email,
      name: user.name,
      password: user.password,
      captcha_token: captchaToken,
    })
  } catch (error: any) {
    return handleRequestError(error);
  }
}

export async function registerDemoUser(captchaToken: string | null) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.post('users/register_demo', {
      captcha_token: captchaToken,
    });
  } catch (error: any) {
    return handleRequestError(error);
  }
}
