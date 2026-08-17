import { Request } from 'express';
import { UAParser } from 'ua-parser-js';

export const extractDeviceMetadata = (req: Request) => {
  const userAgentStr = req.headers['user-agent'] || '';
  const parser = new UAParser(userAgentStr);
  const result = parser.getResult();

  // Parse IP address from standard headers or req.ip
  let ipAddress = req.ip || req.connection.remoteAddress || '';
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    if (typeof xForwardedFor === 'string') {
      ipAddress = xForwardedFor.split(',')[0].trim();
    } else if (Array.isArray(xForwardedFor)) {
      ipAddress = xForwardedFor[0].trim();
    }
  }

  // If running locally, normalize IPv6 loopback to IPv4 loopback
  if (ipAddress === '::1') {
    ipAddress = '127.0.0.1';
  }

  const deviceType = result.device.type === 'mobile' ? 'Mobile' 
                   : result.device.type === 'tablet' ? 'Tablet'
                   : 'Desktop';

  return {
    userAgent: userAgentStr,
    browser: result.browser.name || 'Unknown Browser',
    browserVersion: result.browser.version || 'Unknown',
    os: result.os.name || 'Unknown OS',
    osVersion: result.os.version || 'Unknown',
    deviceType,
    deviceModel: result.device.model || result.device.vendor || 'Unknown',
    ipAddress
  };
};

import prisma from '../lib/prisma';

export const logDeviceAction = async (req: Request, employeeId: string, attendanceId: string, actionType: string, clientMetadata: any = {}) => {
  try {
    const meta = clientMetadata || {};
    const serverMeta = extractDeviceMetadata(req);
    
    await prisma.attendanceDeviceLog.create({
      data: {
        attendanceId,
        employeeId,
        actionType,
        deviceFingerprint: meta.deviceFingerprint || null,
        deviceType: serverMeta.deviceType,
        loginSource: meta.loginSource || null,
        deviceName: meta.deviceName || null,
        browser: serverMeta.browser,
        browserVersion: serverMeta.browserVersion,
        os: serverMeta.os,
        osVersion: serverMeta.osVersion,
        deviceModel: serverMeta.deviceModel,
        screenResolution: meta.screenResolution || null,
        userAgent: serverMeta.userAgent,
        ipAddress: serverMeta.ipAddress,
        timezone: meta.timezone || null,
        language: meta.language || null,
      }
    });
  } catch (error) {
    console.error('Failed to log device action:', error);
    // Don't throw, we don't want to block the attendance action if device logging fails
  }
};
