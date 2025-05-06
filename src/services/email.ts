import emailjs from '@emailjs/browser';
import { EMAILJS_CONFIG } from '../config/emailjs';
import { FormData } from '../types';

export const sendEmail = async (formData: FormData) => {
  const templateParams = {
    from_name: formData.name,
    from_email: formData.email,
    message: formData.message,
    to_email: EMAILJS_CONFIG.toEmail,
  };

  return emailjs.send(
    EMAILJS_CONFIG.serviceId,
    EMAILJS_CONFIG.templateId,
    templateParams,
    EMAILJS_CONFIG.publicKey
  );
};