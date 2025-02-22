import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Logger } from '@nestjs/common';
@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('GMAIL_USER'),
        pass: this.configService.get<string>('GMAIL_APP_PASSWORD'),
      },
      tls: {
        rejectUnauthorized: false,
      },
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // use SSL
    });
  }

  private readonly logoStyle = `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; position: relative;">
        <span style="
          font-family: Arial, sans-serif;
          font-size: 50px;
          font-weight: bold;
          color: #232F3E;
          text-decoration: none;
          position: relative;
        ">amazon</span>
        <span style="
          position: absolute;
          right: 8px;
          bottom: 18px;
          width: 22px;
          height: 22px;
          border: 6px solid #FF9900;
          border-top: 0;
          border-left: 0;
          transform: rotate(45deg);
        "></span>
      </div>
    </div>
  `;

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const mailOptions = {
      from: 'Amazon Website <samman66512@gmail.com>',
      to: to,
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          ${this.logoStyle}
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #232f3e; margin-bottom: 15px;">Verify Your Email Address</h2>
            <p style="color: #666; margin-bottom: 10px;">Hello ${to},</p>
            <p style="color: #666; line-height: 1.5;">Thank you for signing up. To complete your registration, please verify your email address by clicking the button below:</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get<string>('FRONTEND_URL_CLIENT')}/verifyEmail?token=${token}" 
               style="background-color: #ff9900; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
            <p>If you didn't create an account, you can safely ignore this email.</p>
            <p>Best regards,<br>Your Amazon Team</p>
            <p>Amazon © ${new Date().getFullYear()} All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent successfully to: ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to: ${to}`,
        error.stack,
      );
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const mailOptions = {
      from: 'Amazon Website <samman66512@gmail.com>',
      to: to,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          ${this.logoStyle}
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #232f3e; margin-bottom: 15px;">Password Reset Request</h2>
            <p style="color: #666; margin-bottom: 10px;">Hello ${to},</p>
            <p style="color: #666; line-height: 1.5;">We received a request to reset your password. To proceed with resetting your password, please click the button below:</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get<string>('FRONTEND_URL_CLIENT')}/resetPassword?token=${token}" 
               style="background-color: #ff9900; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>

          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <p style="color: #666; margin-bottom: 10px; font-size: 14px;">⚠️ Security Notice:</p>
            <ul style="color: #666; font-size: 14px; padding-left: 20px;">
              <li>This link will expire in 60 minutes.</li>
              <li>If you didn't request this password reset, please ignore this email.</li>
              <li>Never share this reset link with anyone.</li>
            </ul>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
            <p>Best regards,<br>Amazon Team</p>
            <p>Amazon © ${new Date().getFullYear()} All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent successfully to: ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to: ${to}`,
        error.stack,
      );
      throw new Error('Failed to send password reset email');
    }
  }

  async sendAdminPasswordResetEmail(to: string, token: string): Promise<void> {
    const mailOptions = {
      from: 'Amazon Admin Portal <samman66512@gmail.com>',
      to: to,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          ${this.logoStyle}
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #232f3e; margin-bottom: 15px;">Password Reset Request</h2>
            <p style="color: #666; margin-bottom: 10px;">Hello ${to},</p>
            <p style="color: #666; line-height: 1.5;">We received a request to reset your password. To proceed with resetting your password, please click the button below:</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get<string>('FRONTEND_URL_ADMIN')}/resetPassword?token=${token}" 
               style="background-color: #ff9900; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>

          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <p style="color: #666; margin-bottom: 10px; font-size: 14px;">⚠️ Security Notice:</p>
            <ul style="color: #666; font-size: 14px; padding-left: 20px;">
              <li>This link will expire in 60 minutes.</li>
              <li>If you didn't request this password reset, please ignore this email.</li>
              <li>Never share this reset link with anyone.</li>
            </ul>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
            <p>Best regards,<br>Amazon Team</p>
            <p>Amazon © ${new Date().getFullYear()} All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent successfully to: ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to: ${to}`,
        error.stack,
      );
      throw new Error('Failed to send password reset email');
    }
  }

  async sendWelcomeMessage(to: string, userName: string): Promise<void> {
    const mailOptions = {
      from: 'Amazon Website <samman66512@gmail.com>',
      to: to,
      subject: 'Welcome to Amazon!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          ${this.logoStyle}
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #232f3e; margin-bottom: 15px;">Welcome to Amazon!</h2>
            <p style="color: #666; margin-bottom: 10px;">Hello ${userName},</p>
            <p style="color: #666; line-height: 1.5;">Thank you for joining Amazon! We're thrilled to have you as part of our community.</p>
          </div>

          <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #232f3e; margin-bottom: 15px;">What's Next?</h3>
            <ul style="color: #666; line-height: 1.6; padding-left: 20px;">
              <li>Browse our vast selection of products</li>
              <li>Create your wishlist</li>
              <li>Track your orders easily</li>
              <li>Get personalized recommendations</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get<string>('FRONTEND_URL_CLIENT')}/shop" 
               style="background-color: #ff9900; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Start Shopping
            </a>
          </div>

          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <p style="color: #666; margin-bottom: 10px; font-size: 14px;">📱 Download our mobile app:</p>
            <ul style="color: #666; font-size: 14px; padding-left: 20px;">
              <li>Shop on the go</li>
              <li>Get mobile-exclusive deals</li>
              <li>Track orders in real-time</li>
            </ul>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
            <p>Questions? Visit our <a href="${this.configService.get<string>('FRONTEND_URL_CLIENT')}/help" style="color: #ff9900;">Help Center</a></p>
            <p>Best regards,<br>The Amazon Team</p>
            <p>Amazon © ${new Date().getFullYear()} All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Welcome email sent successfully to: ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to: ${to}`,
        error.stack,
      );
      throw new Error('Failed to send welcome email');
    }
  }
}
