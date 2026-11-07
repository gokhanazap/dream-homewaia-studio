import { designRoom } from './room-api.mjs';

export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (/^\/onboarding\/?$/.test(url.pathname) && url.searchParams.has('demo')) {
      url.pathname = '/app/';
      url.searchParams.delete('demo');
      return Response.redirect(url, 302);
    }
    if (url.pathname === '/onboarding' || url.pathname === '/app') {
      url.pathname += '/';
      return Response.redirect(url, 302);
    }

    if (url.pathname === '/app/api/design') return designRoom(request, env);

    if (url.pathname === '/onboarding/' || url.pathname === '/app/') {
      url.pathname += 'index.html';
    } else {
      // Both entry points serve the same base stylesheet and sample images.
      url.pathname = url.pathname.replace(/^\/(?:onboarding|app)(?=\/(?:styles\.css$|assets\/))/, '');
    }
    return env.ASSETS.fetch(new Request(url, request));
  },
};
