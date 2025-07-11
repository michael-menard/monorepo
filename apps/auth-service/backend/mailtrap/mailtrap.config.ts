import { MailtrapClient } from 'mailtrap';
import dotenv from 'dotenv';

dotenv.config();

const TOKEN = process.env.MAILTRAP_API_KEY || '';

export const mailtrapClient = new MailtrapClient({
  token: TOKEN,
});

export interface Sender {
  email: string;
  name: string;
}

export const sender: Sender = {
  email: "hello@demomailtrap.co",
  name: "Michael Menard",
};

