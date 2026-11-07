import { handlePlace } from './api/place.mjs';

export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/onboarding') {
      url.pathname = '/onboarding/';
      return Response.redirect(url, 302);
    }

    url.pathname = url.pathname.replace(/^\/onboarding\//, '/');
    if (url.pathname === '/api/place') return handlePlace(request, env);
    if (url.pathname === '/') url.pathname = '/index.html';
    return env.ASSETS.fetch(new Request(url, request));
  },
};
