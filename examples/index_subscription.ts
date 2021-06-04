import { createServer } from 'http';

import Koa from 'koa';
import mount from 'koa-mount';
import { execute, subscribe } from 'graphql';
import ws from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

import { graphqlHTTP } from '../src';

import { schema, roots, rootValue } from './schema';

const PORT = 4000;
const subscriptionEndpoint = `ws://localhost:${PORT}/subscrip