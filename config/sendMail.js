const nodemailer = require('nodemailer');

const sendEmail = async (email, message, subject) => {
  try {
    const mailTransport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: `${process.env.EMAIL}`,
        pass: `${process.env.EMAIL_PASSWORD}`,
      },
    });
    const mailDetails = {
      from: `${process.env.EMAIL}`,
      to: `${email}`,
      subject: subject,
      html: `<div style="font-family: Arial, sans-serif; font-size: 16px; color: #222;">${message}</div>`,
    };

    await mailTransport.sendMail(mailDetails);
    console.log(`Email sent successfully to ${email}`);
  } catch (err) {
    console.log(`Error sending email: ${err.message}`);
    throw new Error('Failed to send email');
  }
};

module.exports = { sendEmail };
