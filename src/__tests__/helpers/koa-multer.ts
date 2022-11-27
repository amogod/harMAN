import { promisify } from 'util';

import multer from 'multer';
import type Koa from 'koa';

export default function multerWrapper(options?: multer.Options | undefined) {
  const upload = multer(options);
  const uploadSingle = upload.single.bind(upload);

  return {
    ...upload,
    single(...args: Parameters<typeof upload.single>): Koa.Middleware {
      return async functi