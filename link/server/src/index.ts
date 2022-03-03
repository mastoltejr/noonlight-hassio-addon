import express, {
  Request,
  Response,
  NextFunction,
  Application as ExpressApplication,
  RequestHandler,
  application
} from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  combine,
  isEmail,
  anyErrors,
  isUnique,
  matching,
  required,
  strongPassword
} from './validation';
import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';
import cookieParser from 'cookie-parser';

const prisma = new PrismaClient();
dotenv.config();

const app: ExpressApplication = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true
  })
);

const expressPort = process.env.EXPRESS_PORT || 3001;
app.listen(expressPort, () =>
  console.log(`Server running on port ${expressPort}`)
);
