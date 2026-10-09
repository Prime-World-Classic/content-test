import { View } from './view.js';
import { App } from './app.js';

export class ParentEvent {
  static children;

  static async authorization(body) {
    if (!body.id) {
      if (ParentEvent.children) {
        ParentEvent.children.close();
      }

      if ('error' in body) {
        await App.handleAuthPulseSignal(body.error, { ownerLogin: body?.login || '' });
        App.error(body.error);
      }

      return;
    }

    const pulse = await App.syncAuthPulse();
    if (App.isAuthPulseActive(pulse)) {
      const ownerId = Number(pulse?.ownerId || 0);
      const ownerLogin = `${pulse?.ownerLogin || ''}`.trim().toLowerCase();
      const hasOwnerMeta = ownerId > 0 || !!ownerLogin;
      const isOwnerById = ownerId > 0 && Number(body.id) === ownerId;
      const isOwnerByLogin = ownerLogin && `${body.login || ''}`.trim().toLowerCase() === ownerLogin;
      if (!hasOwnerMeta || isOwnerById || isOwnerByLogin) {
        await App.writeAuthPulse(null);
      } else {
        if (ParentEvent.children) {
          ParentEvent.children.close();
        }
        App.error(App.buildAuthPulseMessage(pulse));
        View.show('authorization');
        return;
      }
    }

    await App.storage.set({
      id: body.id,
      token: body.token,
      login: body.login,
      fraction: body.fraction,
      launcherToken: body.launcherToken || '',
      auditToken: body.auditToken || '',
    });

    App.notificationsAuthChanged();

    if (ParentEvent.children) {
      ParentEvent.children.close();
    }

    View.show('castle');
  }

  static async bind(body) {
    if (ParentEvent.children) {
      ParentEvent.children.close();
    }

    App.notify(body);
  }

  // Страница провайдера (регистрация через Яндекс) просит открыть ссылку в
  // системном браузере: попап — окно приложения, и обычная ссылка открыла бы
  // соглашение ещё одним окном лончера. Хост — только наш: сообщение может
  // прислать любая страница, открытая как попап.
  static openExternal(body) {
    const url = `${(body && body.url) || ''}`.trim();
    let host = '';

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return;
      host = parsed.hostname.toLowerCase();
    } catch {
      return;
    }

    if (host !== 'zone-play.com' && !host.endsWith('.zone-play.com')) return;

    App.OpenExternalLink(url);
  }
}
