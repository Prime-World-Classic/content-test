import { DOM } from './dom.js';
import { Lang } from './lang.js';
import { NativeAPI } from './nativeApi.js';

export class RadminGuide {
  static DOWNLOAD_URL = 'https://www.radmin-vpn.com/';

  static VK_URL = 'https://vk.com/primeworld';

  static TELEGRAM_URL = 'https://t.me/primeworldclassic';

  static CHECK_INTERVAL_MS = 4000;

  static CONNECTION_TIMEOUT_MS = 5000;

  static root = null;

  static dismissed = false;

  static wakeWaiter = null;

  static createInstructionItem(number, content) {
    return DOM(
      { tag: 'li', style: 'radmin-guide__step' },
      DOM({ style: 'radmin-guide__step-number' }, `${number}`),
      DOM({ style: 'radmin-guide__step-text' }, content),
    );
  }

  static createDownloadLink() {
    return DOM(
      {
        tag: 'a',
        style: 'radmin-guide__link',
        href: RadminGuide.DOWNLOAD_URL,
        target: '_blank',
        rel: 'noopener noreferrer',
        event: ['click', (event) => NativeAPI.linkHandler(event)],
      },
      'radmin-vpn.com',
    );
  }

  static createSupportLink(url, icon, label) {
    return DOM(
      {
        tag: 'a',
        style: 'radmin-guide__support-link',
        href: url,
        target: '_blank',
        rel: 'noopener noreferrer',
        event: ['click', (event) => NativeAPI.linkHandler(event)],
      },
      DOM({ tag: 'img', src: icon, alt: '', ariaHidden: 'true' }),
      DOM({ tag: 'span' }, label),
    );
  }

  static dismiss() {
    RadminGuide.dismissed = true;
    RadminGuide.hide();
    RadminGuide.wakeWaiter?.();
    RadminGuide.wakeWaiter = null;
  }

  static show() {
    if (RadminGuide.root?.isConnected) {
      return;
    }

    const downloadStep = document.createDocumentFragment();
    downloadStep.append(Lang.text('radminGuideStepDownload'), ' ', RadminGuide.createDownloadLink(), '.');

    const root = DOM(
      { id: 'radmin-connection-guide', style: 'radmin-guide-overlay' },
      DOM(
        { style: ['splash-content', 'splash-content--titled', 'radmin-guide'] },
        DOM({ style: 'title-modal' }, DOM({ style: 'title-modal-text' }, Lang.text('radminGuideTitle'))),
        DOM(
          {
            tag: 'button',
            style: 'close-button',
            type: 'button',
            title: Lang.text('titleClose'),
            ariaLabel: Lang.text('titleClose'),
            event: ['click', () => RadminGuide.dismiss()],
          },
          DOM({ tag: 'img', src: 'content/icons/close-cropped.svg', alt: '', style: 'close-image-style' }),
        ),
        DOM(
          { tag: 'div', style: 'radmin-guide__content' },
          DOM({ tag: 'p', style: 'radmin-guide__description' }, Lang.text('radminGuideDescription')),
          DOM({ tag: 'p', style: 'radmin-guide__intro' }, Lang.text('radminGuideIntro')),
          DOM(
            { tag: 'ol', style: 'radmin-guide__steps' },
            RadminGuide.createInstructionItem(1, downloadStep),
            RadminGuide.createInstructionItem(2, Lang.text('radminGuideStepNetwork')),
            RadminGuide.createInstructionItem(3, Lang.text('radminGuideStepVpn')),
            RadminGuide.createInstructionItem(4, Lang.text('radminGuideStepSettings')),
            RadminGuide.createInstructionItem(5, Lang.text('radminGuideStepTest')),
          ),
          DOM(
            { style: 'radmin-guide__status', role: 'status', ariaLive: 'polite' },
            DOM({ style: 'radmin-guide__spinner', ariaHidden: 'true' }),
            DOM({}, Lang.text('radminGuideWaiting')),
          ),
          DOM(
            { style: 'radmin-guide__support' },
            DOM({ tag: 'p', style: 'radmin-guide__support-text' }, Lang.text('radminGuideSupport')),
            DOM(
              { style: 'radmin-guide__support-links' },
              RadminGuide.createSupportLink(
                RadminGuide.VK_URL,
                'content/icons/vk.webp',
                Lang.text('radminGuideVk'),
              ),
              RadminGuide.createSupportLink(
                RadminGuide.TELEGRAM_URL,
                'content/icons/telegram.webp',
                Lang.text('radminGuideTelegram'),
              ),
            ),
          ),
        ),
      ),
    );

    document.body.append(root);
    RadminGuide.root = root;
  }

  static hide() {
    RadminGuide.root?.remove();
    RadminGuide.root = null;
  }

  static wait(ms) {
    return new Promise((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        if (RadminGuide.wakeWaiter === finish) {
          RadminGuide.wakeWaiter = null;
        }
        resolve();
      };
      const timer = setTimeout(finish, ms);
      RadminGuide.wakeWaiter = finish;
    });
  }

  static testHostConnection(host, timeoutMs = RadminGuide.CONNECTION_TIMEOUT_MS) {
    return new Promise((resolve) => {
      let socket = null;
      let settled = false;

      const finish = (connected) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        if (socket) {
          socket.onopen = null;
          socket.onerror = null;
          socket.onclose = null;
          try {
            if (socket.readyState < WebSocket.CLOSING) {
              socket.close();
            }
          } catch (error) {}
        }

        resolve(connected);
      };

      const timer = setTimeout(() => finish(false), timeoutMs);

      try {
        socket = new WebSocket(host);
        socket.onopen = () => finish(true);
        socket.onerror = () => finish(false);
        socket.onclose = () => finish(false);
      } catch (error) {
        finish(false);
      }
    });
  }

  static testAnyHostConnection(hosts) {
    if (!Array.isArray(hosts) || hosts.length === 0) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      let pending = hosts.length;
      let settled = false;

      hosts.forEach(async (host) => {
        const connected = await RadminGuide.testHostConnection(host);
        if (settled) return;

        if (connected) {
          settled = true;
          resolve(true);
          return;
        }

        pending -= 1;
        if (pending === 0) {
          settled = true;
          resolve(false);
        }
      });
    });
  }

  static async waitForConnection(hosts) {
    RadminGuide.dismissed = false;

    while (!RadminGuide.dismissed && !(await RadminGuide.testAnyHostConnection(hosts))) {
      RadminGuide.show();
      await RadminGuide.wait(RadminGuide.CHECK_INTERVAL_MS);
    }

    RadminGuide.hide();
    return true;
  }
}
