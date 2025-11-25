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
        App.error(body.error);
      }

      return;
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
