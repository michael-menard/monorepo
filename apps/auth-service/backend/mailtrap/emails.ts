import { mailtrapClient, sender } from "./mailtrap.config";
import {PASSWORD_RESET_REQUEST_TEMPLATE, PASSWORD_RESET_SUCCESS_TEMPLATE, VERIFICATION_EMAIL_TEMPLATE, WELCOME_EMAIL_TEMPLATE} from "./emailsTamplate";

interface Recipient {
  email: string;
}

export const sendVarificationEmail = async (email: string, verificationToken: string): Promise<void> => {
  console.log( "Sending email to", email);
  const recipient: Recipient[] = [{ email: 'mlmmayhem@gmail.com' }];

  try {
    const response = await mailtrapClient.send({
      from: sender,
      to: recipient,
      subject: "Email Verification",
      html: VERIFICATION_EMAIL_TEMPLATE.replace('{verificationCode}', verificationToken),
      category: "email verification"
    });

    console.log('>>>>>>>sendVarificationEmail', response, recipient, "Email sent successfully");
  } catch (e) {
    console.log(e);
    throw new Error("Email sending failed");
  }
}

export const sendWelcomeEmail = async (email: string, name: string) => {
  console.log('Inside sendWelcomeEmail -> sending welcome email to ', email, ' with name ', name)

  const recipient = [{ email: 'mlmmayhem@gmail.com' }];

  console.log('actual recipient', recipient)

  try {
    const response = await mailtrapClient.send({
      from: sender,
      to: recipient,
      subject: `Welcome ${name || 'to the app'}`,
      html: WELCOME_EMAIL_TEMPLATE,
      category: "welcome email"
    })

    console.log('>>>>>>sendWelcomeEmail', response, recipient, "Email sent successfully");
  } catch (e) {
    console.log(e);
    throw new Error("Email sending failed");
  }
}

export const sendPasswordResetEmail = async (email: string, resetUrl: string): Promise<void> => {
  const recipient = [{ email }]

  try {
    console.log('>>>>>>>>>>>>>>>>> inside sendPasswordResetEmail, inside try')
    console.log('Sending password reset email to:', email, 'with URL:', resetUrl);
    // const response = await mailtrapClient.send({
    //   from: sender,
    //   to: recipient,
    //   subject: "Password Reset",
    //   html: PASSWORD_RESET_REQUEST_TEMPLATE.replace('{resetURL}', resetUrl),
    //   category: "password reset"
    // });

    // console.log('>>>>>>sendPasswordResetEmail', response, recipient, "Email sent successfully");
  } catch (e) {
    console.log(e);
    throw new Error("Email sending failed");
  }
}

export const sendResetSuccessEmail = async (email: string): Promise<void> => {
  const recipient = [{ email }]

  try {
    const response = await mailtrapClient.send({
      from: sender,
      to: recipient,
      subject: "Password Reset Successful",
      html: PASSWORD_RESET_SUCCESS_TEMPLATE,
      category: "password reset"
    });

  } catch (e) {
    console.log(e);
    throw new Error("Email sending failed");
  }
}