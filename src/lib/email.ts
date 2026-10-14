import "server-only";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
}) {
  if (!resend) {
    console.log(`[email not sent] to ${opts.to} : ${opts.subject}\n${opts.html}`);
    return;
  }
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    ...opts,
  });
  if (error) throw new Error(`Envoi e-mail impossible : ${error.message}`);
}
