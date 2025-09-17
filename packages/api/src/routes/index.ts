import { FastifyPluginAsync } from 'fastify';
import libraryRoutes from './library.js';
import artworkRoutes from './artwork.js';
import indexerRoutes from './indexers.js';
import requestsRoutes from './requests.js';
import downloadsRoutes from './downloads.js';
import subtitlesRoutes from './subtitles.js';
import calendarRoutes from './calendar.js';
import settingsRoutes from './settings.js';

const routes: FastifyPluginAsync = async (app) => {
  await app.register(libraryRoutes, { prefix: '/library' });
  await app.register(artworkRoutes, { prefix: '/artwork' });
  await app.register(indexerRoutes, { prefix: '/indexers' });
  await app.register(requestsRoutes, { prefix: '/requests' });
  await app.register(downloadsRoutes, { prefix: '/downloads' });
  await app.register(subtitlesRoutes, { prefix: '/subtitles' });
  await app.register(calendarRoutes, { prefix: '/calendar' });
  await app.register(settingsRoutes, { prefix: '/settings' });
};

export default routes;
