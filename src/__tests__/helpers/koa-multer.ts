import { promisify } from 'util';

import multer from 'multer';
import type Koa from 'koa';

export default function multerWrapper(options?: multer.Options | undefined) {
  const up