import { DOM } from './dom.js';
import { Lang } from './lang.js';
import { App } from './app.js';
import { NativeAPI } from './nativeApi.js';
import { Splash } from './splash.js';
import { domAudioPresets } from './domAudioPresets.js';

export class Chat {
  static body;

  static hide = false;

  static to = 0;

  static STORAGE_KEY = 'castle_chat_messages_v1';

  /** Время жизни сообщений в истории (мс). */
  static CHAT_HISTORY_TTL_MS = 2 * 60 * 60 * 1000;

  static MAX_HISTORY = 20;

  static messages = [];

  static pinnedMessages = [];

  static pinnedCollapsed = true;

  static pinnedContainer;

  static initView() {
    let scrollBtn = DOM(
      {
        style: 'scroll-btn',
        domaudio: domAudioPresets.smallButton,
        event: [
          'click',
          () => {
            Chat.scroll(true);
          },
        ],
        title: 'Прокрутить чат вниз', // Добавляем описание при наведении
      },
      '▼',
    ); // Замените '▼' на нужный вам текст или символ для кнопки прокрутки

    let input = DOM({
      tag: 'input',
      domaudio: domAudioPresets.chatButton,
      style: 'chat-input',
      placeholder: Lang.text('enterTextAndPressEnter'),
    });

    Chat.input = DOM({ style: 'chat-input-container' }, input, scrollBtn);

    Chat.pinnedContainer = DOM({ style: 'chat-pinned-container' });

    Chat.body = DOM({ style: 'chat' }, DOM({ style: 'chat-body' }), Chat.pinnedContainer, Chat.input);

    Chat.roleTooltip = DOM({ style: 'chat-role-tooltip' });
    document.body.append(Chat.roleTooltip);

    Chat.body.addEventListener('mouseenter', (e) => {
      const el = e.target.closest('[data-tooltip-source], [data-tooltip-role]');
      if (!el || !Chat.body.contains(el)) return;
      const source = el.getAttribute('data-tooltip-source');
      const role = el.getAttribute('data-tooltip-role');
      if (!source && !role) return;
      const lines = [];
      if (source) lines.push(source);
      if (role) lines.push(role);
      Chat.roleTooltip.innerHTML = '';
      lines.forEach((line) => {
        Chat.roleTooltip.append(DOM({ tag: 'div' }, line));
      });
      Chat.roleTooltip.style.display = 'block';
      const place = () => {
        const r = el.getBoundingClientRect();
        const chatRect = Chat.body.getBoundingClientRect();
        const tw = Chat.roleTooltip.offsetWidth;
        const gap = 8;
        Chat.roleTooltip.style.left = `${chatRect.left - tw - gap}px`;
        Chat.roleTooltip.style.top = `${r.top}px`;
      };
      requestAnimationFrame(place);
      requestAnimationFrame(place);
    }, true);
    Chat.body.addEventListener('mouseleave', (e) => {
      if (e.relatedTarget !== Chat.roleTooltip && !Chat.roleTooltip.contains(e.relatedTarget)) {
        Chat.roleTooltip.style.display = 'none';
      }
    }, true);
    Chat.roleTooltip.addEventListener('mouseleave', () => { Chat.roleTooltip.style.display = 'none'; });

    Chat.body.addEventListener('mouseleave', () => Chat.collapsePinnedList());

    const handleSend = async (event) => {
      if (!App.isEnterKey(event)) return;

      event.preventDefault();
      await Chat.sendMessage();
    };

    input.addEventListener('keydown', handleSend);

    input.addEventListener('input', () => {
      if (!Chat.input.firstChild.value) {
        Chat.to = 0;
      }
    });
  }

  static init() {
    Chat.initView();

    Chat.loadHistory();

    document.addEventListener('keydown', (event) => {
      if (event.code == 'KeyM' && (event.ctrlKey || event.metaKey)) {
        changeChatVisibility();
      }
    });
  }

  static changeChatVisibility() {
    if (Chat.hide) {
      Chat.body.style.display = 'block';

      Chat.hide = false;
    } else {
      Chat.body.style.display = 'none';

      Chat.hide = true;
    }
  }

  static wrapLinksInATag(message) {
    const urlRegex = /(https:\/\/[^\s]+)/g;
    return message.replace(urlRegex, '<a href="$1">$1</a>');
  }

  static get canManagePins() {
    return App.isAdmin() || App.isHelper();
  }

  static focusReplyTo(data) {
    Chat.to = data.id;
    Chat.body.lastChild.firstChild.value = `@${data.nickname}, `;
    Chat.input.firstChild.focus();
  }

  static createPinButton(data, label = '📌') {
    return DOM(
      {
        tag: 'button',
        style: 'chat-pin-button',
        event: [
          'click',
          async (e) => {
            e.stopPropagation();
            await Chat.togglePin(data);
          },
        ],
      },
      label,
    );
  }

  static getMessageIdentityKey(data) {
    if (!data || typeof data !== 'object') {
      return '';
    }
    const uuid = data.uuid;
    if (uuid !== undefined && uuid !== null && String(uuid) !== '') {
      return `uuid:${String(uuid)}`;
    }
    const messageId = data.messageId;
    if (messageId !== undefined && messageId !== null && String(messageId) !== '') {
      return `messageId:${String(messageId)}`;
    }
    return '';
  }

  static isSameMessage(left, right) {
    const leftKey = Chat.getMessageIdentityKey(left);
    const rightKey = Chat.getMessageIdentityKey(right);
    return Boolean(leftKey && rightKey && leftKey === rightKey);
  }

  static escapeSelectorAttributeValue(value) {
    const stringValue = String(value ?? '');
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      return CSS.escape(stringValue);
    }
    return stringValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  static findMessageItemByAttribute(attrName, datasetKey, value) {
    const body = Chat.body?.firstChild;
    if (!body || value === undefined || value === null || value === '') {
      return null;
    }
    const rawValue = String(value);
    const escapedValue = Chat.escapeSelectorAttributeValue(rawValue);
    if (escapedValue) {
      try {
        const item = body.querySelector(`.chat-body-item[data-${attrName}="${escapedValue}"]`);
        if (item) return item;
      } catch (error) {
        // Fallback below for malformed selectors or unsupported escaping.
      }
    }
    const list = body.querySelectorAll(`.chat-body-item[data-${attrName}]`);
    for (const item of list) {
      if (item.dataset?.[datasetKey] === rawValue) {
        return item;
      }
    }
    return null;
  }

  static findMessageItemByKey(messageKey) {
    return Chat.findMessageItemByAttribute('message-key', 'messageKey', messageKey);
  }

  static findMessageItemByEchoId(echoId) {
    return Chat.findMessageItemByAttribute('echo-id', 'echoId', echoId);
  }

  static isLocalEchoItem(item) {
    if (!item) return false;
    if (item.dataset?.localEcho === '1') return true;
    return String(item.dataset?.messageId || '').startsWith('local-');
  }

  static findLocalEchoItemByEchoId(echoId) {
    const body = Chat.body?.firstChild;
    if (!body || echoId === undefined || echoId === null || echoId === '') {
      return null;
    }
    const rawEchoId = String(echoId);
    const escapedEchoId = Chat.escapeSelectorAttributeValue(rawEchoId);
    if (escapedEchoId) {
      try {
        const localBySelector = body.querySelector(
          `.chat-body-item[data-echo-id="${escapedEchoId}"][data-local-echo="1"]`,
        );
        if (localBySelector) return localBySelector;
      } catch (error) {
        // Fallback below when selector cannot be parsed.
      }
    }
    const items = body.querySelectorAll('.chat-body-item[data-echo-id]');
    for (const item of items) {
      if (item.dataset?.echoId !== rawEchoId) continue;
      if (Chat.isLocalEchoItem(item)) return item;
    }
    return null;
  }

  static removeLocalEcho(echoId) {
    const localEcho = Chat.findLocalEchoItemByEchoId(echoId);
    if (localEcho) {
      localEcho.remove();
    }
  }

  static updateExistingMessageItem(existingItem, data, messageKey) {
    const { flag, sourceIcon, nickname, message, time } = Chat.buildMessageContent(data);
    const parts = [];
    if (flag) parts.push(flag);
    if (sourceIcon) parts.push(sourceIcon);
    parts.push(nickname, message, time);
    const contentWrap = DOM({ style: 'chat-body-item-content' }, ...parts);
    const oldContentWrap = existingItem.querySelector('.chat-body-item-content');
    if (oldContentWrap) oldContentWrap.replaceWith(contentWrap);
    else existingItem.prepend(contentWrap);
    existingItem.dataset.messageId = data.messageId;
    existingItem.dataset.messageKey = messageKey || existingItem.dataset.messageKey || '';
    existingItem.dataset.localEcho = data.localEcho ? '1' : '0';
    if (data.echoId) {
      existingItem.dataset.echoId = data.echoId;
    }
  }

  /** Syncs pinned list from one message (add/update or remove), keeps list open, re-renders. */
  static syncPinnedMessage(data) {
    if (!Array.isArray(Chat.pinnedMessages)) Chat.pinnedMessages = [];
    const messageKey = Chat.getMessageIdentityKey(data);
    Chat.pinnedMessages = Chat.pinnedMessages.filter((m) => {
      if (!messageKey) return true;
      return Chat.getMessageIdentityKey(m) !== messageKey;
    });
    if (data.pinned) Chat.pinnedMessages.push(data);
    Chat.pinnedCollapsed = false;
    Chat.renderPinnedMessages();
  }

  static revealChatIfNeeded() {
    if (Chat.hide) {
      Chat.body.style.display = 'block';
      Chat.hide = false;
    }
  }

  static collapsePinnedList() {
    const listWrap = Chat.pinnedContainer?.querySelector('.chat-pinned-list-wrap');
    if (listWrap) listWrap.classList.add('chat-pinned-list-wrap-collapsed');
    Chat.pinnedCollapsed = true;
  }

  static getMessageSourceType(data) {
    if (Number(data?.client) === 1) return 'phone';
    if (Number(data?.id) === -2) return 'telegram';
    return null;
  }

  static getMessageSourceLabel(data) {
    const source = Chat.getMessageSourceType(data);
    if (source === 'phone') return Lang.text('titlePhone');
    if (source === 'telegram') return Lang.text('titleTelegram');
    return '';
  }

  static isFromCastleMessage(data) {
    if (!data || typeof data !== 'object') return true;
    if (typeof data.fromCastle === 'boolean') return data.fromCastle;
    if (typeof data.isCastle === 'boolean') return data.isCastle;
    if ('castle' in data) {
      const v = data.castle;
      if (typeof v === 'boolean') return v;
      if (Number.isFinite(Number(v))) return Number(v) !== 0;
    }
    return false;
  }

  static getFlagLabel(flagId) {
    if (!flagId || flagId === 0) return '';
    const key = `flag_${flagId}`;
    const text = Lang.text(key);
    if (!text || text === key) return String(flagId);
    return text;
  }

  static extractMessageTimestamp(data) {
    const candidates = [data?._ts, data?.timestamp, data?.time, data?.date, data?.createdAt];
    for (const value of candidates) {
      if (value === undefined || value === null || value === '') continue;
      let ts = NaN;
      if (typeof value === 'number') {
        ts = Number(value);
      } else if (typeof value === 'string') {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
          ts = numeric;
        } else {
          const parsed = Date.parse(value);
          if (Number.isFinite(parsed)) ts = parsed;
        }
      } else if (value instanceof Date) {
        ts = value.getTime();
      }
      if (!Number.isFinite(ts)) continue;
      // treat small numeric timestamps as seconds
      if (ts > 0 && ts < 1e12) ts *= 1000;
      if (Number.isFinite(ts) && ts > 0) return Math.floor(ts);
    }
    return Date.now();
  }

  static formatMessageTime(data) {
    const date = new Date(Chat.extractMessageTimestamp(data));
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  /** Builds flag, nickname and message nodes with same styling as chat (for viewMessage and pinned list). */
  static buildMessageContent(data) {
    let flag = null;
    if (data.flag && data.flag !== 0) {
      flag = DOM({ tag: 'img' });
      flag.setAttribute('src', `content/flags/${data.flag}.png`);
      flag.classList.add('chat-flag');
      const flagLabel = Chat.getFlagLabel(data.flag);
      if (flagLabel) flag.dataset.tooltipSource = flagLabel;
    }

    const sourceLabel = Chat.getMessageSourceLabel(data);
    const fromCastle = Chat.isFromCastleMessage(data);
    let sourceIcon = null;
    if (sourceLabel && !fromCastle) {
      const sourceType = Chat.getMessageSourceType(data) || 'unknown';
      sourceIcon = DOM({ tag: 'span', style: ['chat-source-icon', `chat-source-icon-${sourceType}`] });
      sourceIcon.dataset.tooltipSource = sourceLabel;
      sourceIcon.textContent = sourceType === 'phone' ? '📱' : '';
    }

    const nickname = DOM({ tag: 'div' }, data.nickname + ': ');
    nickname.style.color = 'rgb(250, 229, 108)';
    nickname.style.fontWeight = 100;
    if (data.id == 1) {
      nickname.style.color = 'transparent';
      nickname.style.fontWeight = 600;
      nickname.classList.add('owner-text');
      nickname.dataset.tooltipRole = Lang.text('titleOwner');
    } else if (data.id == -2) {
      nickname.style.color = 'rgb(250, 229, 108)';
      nickname.style.fontWeight = 600;
    } else if (App.isAdmin(data.id)) {
      nickname.style.color = 'transparent';
      nickname.style.fontWeight = 600;
      nickname.classList.add('administration-text');
      nickname.dataset.tooltipRole = Lang.text('titleAdministration');
    } else if (App.isHelper(data.id)) {
      nickname.style.color = '#48D1CC';
      nickname.style.fontWeight = 600;
      nickname.classList.add('helper-text');
      nickname.dataset.tooltipRole = Lang.text('titleHelper');
    }

    const message = DOM({ tag: 'div' });
    if (data.id == 1) {
      if (String(data.message).slice(0, 5) == 'https') {
        message.append(DOM({ tag: 'img', src: data.message }));
      } else {
        message.innerText = `${data.message}`;
      }
    } else {
      message.innerText = `${data.message}`;
    }
    if (App.isAdmin(data.id)) {
      if (String(data.message).includes('https') && !String(data.message).includes('.gif')) {
        message.innerHTML = this.wrapLinksInATag(message.innerHTML);
      }
      if (NativeAPI.status) {
        message.addEventListener('click', (e) => NativeAPI.linkHandler(e));
      }
    }
    if (data.to == -1) {
      message.style.color = 'rgb(255,50,0)';
      message.style.fontWeight = 600;
      message.style.fontStyle = 'italic';
    } else if (data.to == App.storage.data.id) {
      message.style.color = 'rgba(51,255,0,0.9)';
    }

    const time = DOM({ tag: 'span', style: 'chat-body-item-time' }, `${Chat.formatMessageTime(data)}`);

    return { flag, sourceIcon, nickname, message, time };
  }

  static viewMessage(data, fromHistory = false) {
    if (!data) {
      return;
    }
    
    if (data.echoId && !data.localEcho) {
      Chat.removeLocalEcho(data.echoId);
    }

    if (!data.messageId) {
      data.messageId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }
    if (!Number.isFinite(Number(data?._ts))) {
      data._ts = Chat.extractMessageTimestamp(data);
    }
    const messageKey = Chat.getMessageIdentityKey(data);

    let existingItem = Chat.findMessageItemByKey(messageKey);
    if (!existingItem && data.uuid && data.messageId !== undefined && data.messageId !== null && data.messageId !== '') {
      existingItem = Chat.findMessageItemByKey(`messageId:${String(data.messageId)}`);
    }
    if (existingItem) {
      Chat.updateExistingMessageItem(existingItem, data, messageKey);
      existingItem.querySelector('.chat-pin-button')?.remove();
      if (data.pinned) {
        Chat.syncPinnedMessage(data);
        if (!fromHistory) Chat.revealChatIfNeeded();
      } else {
        const wasInPinned = Chat.pinnedMessages.some((m) => Chat.isSameMessage(m, data));
        if (wasInPinned) Chat.syncPinnedMessage(data);
        if (Chat.canManagePins) {
          existingItem.append(Chat.createPinButton(data));
        }
      }
      if (!fromHistory && !data.pinned && !data.localEcho) Chat.addMessageToHistory(data);
      Chat.scroll();
      return;
    }

    if (data.pinned) {
      Chat.syncPinnedMessage(data);
      if (!fromHistory) Chat.revealChatIfNeeded();
      return;
    }

    const wasOnlyPinned = Chat.pinnedMessages.some((m) => Chat.isSameMessage(m, data));
    if (wasOnlyPinned) {
      Chat.syncPinnedMessage(data);
      return;
    }

    const { flag, sourceIcon, nickname, message, time } = Chat.buildMessageContent(data);
    const parts = [];
    if (flag) parts.push(flag);
    if (sourceIcon) parts.push(sourceIcon);
    parts.push(nickname, message, time);
    const contentWrap = DOM({ style: 'chat-body-item-content' }, ...parts);
    const item = DOM(
      {
        style: 'chat-body-item',
        domaudio: domAudioPresets.bigButton,
        event: ['click', () => Chat.focusReplyTo(data)],
      },
      contentWrap,
    );

    item.dataset.messageId = data.messageId;
    item.dataset.messageKey = messageKey;
    item.dataset.echoId = data.echoId || '';
    item.dataset.localEcho = data.localEcho ? '1' : '0';
    if (Chat.canManagePins && !data.pinned) item.append(Chat.createPinButton(data));

    item.addEventListener('contextmenu', () => {
      if (App.isAdmin() || App.isHelper()) {
        let body = document.createDocumentFragment();

        body.append(
          DOM(`Выдать мут чата ${data.nickname}?`),
          DOM(
            {
              style: 'splash-content-button',
              domaudio: domAudioPresets.bigButton,
              event: [
                'click',
                async () => {
                  await App.api.request('user', 'mute', { id: data.id });

                  Splash.hide();
                },
              ],
            },
            'Да',
          ),
          DOM(
            {
              style: 'splash-content-button',
              domaudio: domAudioPresets.bigButton,
              event: ['click', async () => Splash.hide()],
            },
            'Нет',
          ),
        );

        Splash.show(body);
      }

      return false;
    });

    Chat.body.firstChild.prepend(item);

    if (data.pinned) {
      Chat.syncPinnedMessage(data);
      if (!fromHistory) Chat.revealChatIfNeeded();
    } else if (Chat.pinnedMessages.some((m) => Chat.isSameMessage(m, data))) {
      Chat.syncPinnedMessage(data);
    }
    if (!fromHistory && !data.pinned && !data.localEcho) Chat.addMessageToHistory(data);
    Chat.scroll();
  }

  static async sendMessage() {
    if (Chat.input.firstChild.value.length > 128) {
      return;
    }
    
    const text = String(Chat.input.firstChild.value || '').trim();
    if (!text.length) {
      Chat.input.firstChild.value = '';
      Chat.to = 0;
      return;
    }
    const to = Chat.to;
    const echoId = `${App.storage.data.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    Chat.viewMessage({
      messageId: `local-${echoId}`,
      id: App.storage.data.id,
      nickname: App.storage.data.login,
      to,
      flag: 0,
      message: text,
      pinned: false,
      client: 0,
      echoId,
      localEcho: true,
    });

    try {
      await App.api.request('user', 'chat', {
        message: text,
        to,
        echoId,
      });
    } catch (error) {
      Chat.removeLocalEcho(echoId);
      throw error;
    }

    Chat.to = 0;

    Chat.input.firstChild.value = '';
  }

  static scroll(forceScroll = false) {
    if (
      Chat.body.firstChild.children.length &&
      (forceScroll || Chat.body.firstChild.firstChild.offsetTop == Chat.body.firstChild.firstChild.offsetHeight)
    ) {
      Chat.body.firstChild.firstChild.scrollIntoView({
        block: 'end',
        behavior: 'smooth',
      });
    }
  }

  static addMessageToHistory(data) {
    try {
      const clone = { ...data, _ts: Date.now() };
      if (!Array.isArray(Chat.messages)) {
        Chat.messages = [];
      }
      const messageKey = Chat.getMessageIdentityKey(clone);
      if (messageKey) {
        Chat.messages = Chat.messages.filter((msg) => Chat.getMessageIdentityKey(msg) !== messageKey);
      }
      Chat.messages.unshift(clone);
      if (Chat.messages.length > Chat.MAX_HISTORY) {
        Chat.messages.length = Chat.MAX_HISTORY;
      }
      localStorage.setItem(Chat.STORAGE_KEY, JSON.stringify(Chat.messages));
    } catch (e) {
      console.error('Failed to save chat history', e);
    }
  }

  static loadHistory() {
    try {
      const raw = localStorage.getItem(Chat.STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }
      const now = Date.now();
      const ttl = Chat.CHAT_HISTORY_TTL_MS;
      Chat.messages = parsed.filter((msg) => {
        const ts = msg._ts ?? 0;
        return now - ts < ttl;
      });
      if (Chat.messages.length !== parsed.length) {
        localStorage.setItem(Chat.STORAGE_KEY, JSON.stringify(Chat.messages));
      }
      for (let i = Chat.messages.length - 1; i >= 0; i--) {
        Chat.viewMessage(Chat.messages[i], true);
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
  }

  static fillPinnedList(list) {
    while (list.firstChild) list.firstChild.remove();

    Chat.pinnedMessages.forEach((msg) => {
      const { flag, sourceIcon, nickname, message, time } = Chat.buildMessageContent(msg);
      const parts = [];
      if (flag) parts.push(flag);
      if (sourceIcon) parts.push(sourceIcon);
      parts.push(nickname, message, time);
      const contentWrap = DOM({ style: 'chat-body-item-content' }, ...parts);
      const row = DOM(
        {
          style: ['chat-body-item', 'chat-pinned-item'],
          domaudio: domAudioPresets.bigButton,
          event: ['click', () => Chat.focusReplyTo(msg)],
        },
        contentWrap,
      );

      if (Chat.canManagePins) row.append(Chat.createPinButton(msg, '❌'));
      list.append(row);
    });
  }

  static renderPinnedMessages() {
    if (!Chat.pinnedContainer) {
      return;
    }

    const hasPinned = Array.isArray(Chat.pinnedMessages) && Chat.pinnedMessages.length > 0;
    Chat.body?.classList.toggle('chat-has-pinned', hasPinned);

    const existingListWrap = Chat.pinnedContainer.querySelector('.chat-pinned-list-wrap');
    const existingList = existingListWrap?.querySelector('.chat-pinned-list');
    const existingHeader = Chat.pinnedContainer.querySelector('.chat-pinned-header');

    if (hasPinned && existingHeader && existingList) {
      const last = Chat.pinnedMessages[Chat.pinnedMessages.length - 1];
      existingHeader.children[1].textContent = last.message;
      existingHeader.children[2].textContent = Chat.pinnedMessages.length;
      Chat.fillPinnedList(existingList);
      if (!Chat.pinnedCollapsed) existingListWrap.classList.remove('chat-pinned-list-wrap-collapsed');
      return;
    }

    while (Chat.pinnedContainer.firstChild) {
      Chat.pinnedContainer.firstChild.remove();
    }

    if (!hasPinned) {
      Chat.pinnedContainer.style.display = 'none';
      return;
    }

    Chat.pinnedContainer.style.display = 'block';

    const total = Chat.pinnedMessages.length;
    const last = Chat.pinnedMessages[total - 1];

    const header = DOM(
      {
        style: ['chat-pinned-header', 'chat-pinned-message'],
        event: [
          'click',
          () => {
            Chat.pinnedCollapsed = !Chat.pinnedCollapsed;
            if (Chat.pinnedCollapsed) Chat.collapsePinnedList();
            else Chat.renderPinnedMessages();
          },
        ],
      },
    );

    const title = DOM({ tag: 'div' }, '📌 ');
    const headerText = DOM({ tag: 'div' }, last.message);
    const count = DOM({ tag: 'div', style: 'chat-pinned-count' }, `${total}`);

    header.append(title, headerText, count);
    Chat.pinnedContainer.append(header);

    const listWrap = DOM({ style: 'chat-pinned-list-wrap' });
    listWrap.classList.add('chat-pinned-list-wrap-collapsed');
    const list = DOM({ style: 'chat-pinned-list' });

    Chat.fillPinnedList(list);

    listWrap.append(list);
    Chat.pinnedContainer.append(listWrap);

    if (!Chat.pinnedCollapsed) {
      requestAnimationFrame(() => listWrap.classList.remove('chat-pinned-list-wrap-collapsed'));
    }
  }

  static async togglePin(data) {
    if (!data || !data.messageId) {
      return;
    }

    const isPinnedNow =
      Array.isArray(Chat.pinnedMessages) && Chat.pinnedMessages.some((msg) => Chat.isSameMessage(msg, data));
    const shouldPin = !isPinnedNow;

    try {
      await App.api.request('user', 'chatPin', {
        messageId: data.messageId,
        pinned: shouldPin,
      });
    } catch (error) {
      App.error(error);
    }
  }

}
