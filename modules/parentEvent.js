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
    });

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
}
