import { DOM } from './dom.js';
import { Lang } from './lang.js';
import { CastleNAVBAR } from './castleNavBar.js';
import { View } from './view.js';
import { Rank } from './rank.js';
import { App } from './app.js';
import { Voice } from './voice.js';
import { VoiceGameBridge } from './voiceGameBridge.js';
import { shouldYieldToIncomingCall } from './voiceGlare.js';
import { Chat } from './chat.js';
import { NativeAPI } from './nativeApi.js';
import { MM } from './mm.js';
import { PWGame } from './pwgame.js';
import { Splash } from './splash.js';
import { Sound } from './sound.js';
import { SOUNDS_LIBRARY } from './soundsLibrary.js';
import { domAudioPresets } from './domAudioPresets.js';
import { Castle } from './castle.js';
import { Window } from './window.js';
import { Settings } from './settings.js';
import { HeroFrame } from './heroFrame.js';

export class Events {
  static lobbySnapshotRequestId = 0;
  static pendingLobbySnapshot = null;
  static closeMainFarmAndInventoryWindows() {
    const mainWindowId = Window.windows?.main?.id;
    if (mainWindowId === 'wgame' || mainWindowId === 'winventory') {
      Window.close('main');
    }
  }

  static Message(data) {
    let body = document.createDocumentFragment();

    body.append(DOM(`${data.message}`));

    Splash.show(body);

    setTimeout(() => Splash.hide(), 3000);
  }

  static MMReady(data) {
    if (!NativeAPI.status) {
      return;
    }

    ++Events.lobbySnapshotRequestId;
    // NativeAPI.attention();
    Events.closeMainFarmAndInventoryWindows();

    MM.ready(data);
  }

  static MMReadyCount(data) {
    if (!NativeAPI.status) {
      return;
    }

    let find = document.getElementById('MMReady');

    if (find) {
      find.innerText = `${data.count}/${data.limit}`;
    }
  }

  static async MMStart(data) {
    if (!NativeAPI.status) {
      return;
    }

    // NativeAPI.attention();
    Events.closeMainFarmAndInventoryWindows();

    const requestId = ++Events.lobbySnapshotRequestId;
    const id = String(data.id);
    const previous = Events.pendingLobbySnapshot;
    const pending = previous?.id === id ? previous : {
      id,
      promise: (async () => {
        if (previous) await previous.promise.catch(() => {});
        return App.api.request(App.CURRENT_MM, 'lobbySnapshot', { id });
      })(),
    };
    Events.pendingLobbySnapshot = pending;
    try {
      const snapshot = await pending.promise;
      if (requestId !== Events.lobbySnapshotRequestId) return;
      if (!snapshot || String(snapshot.id) !== String(data.id) || !snapshot.users) throw new Error('lobbyUnavailable');
      await MM.lobby(snapshot);
    } catch {
      if (requestId !== Events.lobbySnapshotRequestId) return;
      App.error(Lang.text('lobbySnapshotLoadError'), 10000);
    } finally {
      if (Events.pendingLobbySnapshot === pending) Events.pendingLobbySnapshot = null;
    }
  }

  static MMChangeHero(data) {
    if (!NativeAPI.status) {
      return;
    }

    MM.eventChangeHero(data);
  }

  static MMBanHero(data) {
    if (!NativeAPI.status) {
      return;
    }

    MM.eventBanHero(data);
  }

  static MMChat(data) {
    // Сообщения игроков своей команды в лобби — ещё и во вкладку «Команда» чата.
    Chat.onTeamLobby(data, MM.lobbyUsers?.[data?.id]?.nickname);

    if (!NativeAPI.status) {
      return;
    }

    MM.chat(data);
  }

  static MMPosition(data) {
    if (!NativeAPI.status) {
      return;
    }

    if (MM.renderBody) {
      for (let item of MM.renderBody.children) {
        if (item.dataset.player == data.id) {
          item.dataset.player = 0;

          item.style.backgroundImage = 'none';

          item.style.transform = 'scale(1)';
        }

        if (data.position != 0) {
          if (item.dataset.position == data.position) {
            let findPlayer = document.getElementById(`PLAYER${data.id}`);

            if (findPlayer) {
              item.dataset.player = data.id;

              item.style.backgroundImage =
                findPlayer.dataset.hero != 0
                  ? `url(content/hero/${findPlayer.dataset.hero}/${findPlayer.dataset.skin}.webp)`
                  : `url(content/hero/empty.webp)`;

              item.style.transform = 'scale(1)';
            }
          }
        }
        MM.updateMapPointTooltip(item);
      }
    }
  }

  static MMHero(data) {
    if (!NativeAPI.status) {
      return;
    }

    MM.select(data);
  }
  
  static MMSyncHeroes(data) {
    if (!NativeAPI.status) {
      return;
    }
    
    MM.syncHeroes(data);
  }

  static MMEnd(data) {
    if (!NativeAPI.status) {
      return;
    }

    ++Events.lobbySnapshotRequestId;
    MM.finish(data);
  }

  // Бэкенд выбирает игровой сервер по стоимости: пока игрок ещё в лобби
  // ожидания — промерить alive-пул прямыми UDP-пробами (логин-порт base+1)
  // и доложить. После MMEnd игра уже запущена (isInBattle) — игнор.
  static MMRequestPing(data) {
    if (!NativeAPI.status || MM.isInBattle) {
      return;
    }

    PWGame.probePoolForReport(data);
  }

  // Бэкенд отменил матч: ни один игровой сервер не принял сессию.
  // Ищем выход из UI «ожидание боя» (лончер выходит оттуда только по
  // MMEnd), возвращаем игрока в замок; поиск можно запустить заново.
  static MMCancel(data) {
    if (!NativeAPI.status) {
      return;
    }

    MM.close();
    MM.searchActive(false);

    let body = document.createDocumentFragment();

    body.append(DOM(Lang.text('mmMatchCancelled')));

    Splash.show(body);

    setTimeout(() => Splash.hide(), 4000);
  }

  static PInvite(data) {
    Window.inviteData = data;
    
    Window.show('main', 'inviteWindow');
  }

  static PUpdate(data) {
    MM.partyId = Number(data?.id || MM.partyId || 0);
    MM.partyMembersCount = Object.keys(data?.users || {}).length || 1;
    if (data && ('mode' in data)) {
      CastleNAVBAR.setMode(Number(data.mode) + 1, { syncParty: false });
    }
    View.refreshCastlePlayOnly(data).catch((error) => App.error(error));
  }
  
  static PMode(data) {
    if (!data || !('mode' in data)) {
      return;
    }
    CastleNAVBAR.setMode(Number(data.mode) + 1, { syncParty: false });
  }

  static PHero(data) {
    let find = document.getElementById(`PP${data.id}`);

    if (find) {
      const playerElement = find.children[1]; // castle-play-lobby-player
      const newHeroImg = data.hero
        ? `url(content/hero/${data.hero}/${data.skin ? data.skin : 1}.webp)`
        : `url(content/hero/empty.webp)`;
      playerElement.style.backgroundImage = `${newHeroImg}, url(content/hero/background.png)`;
      playerElement.style.backgroundRepeat = 'no-repeat, no-repeat';
      playerElement.style.backgroundPosition = 'center, center';
      playerElement.style.backgroundSize = 'contain, contain';

      // рамка по победам на выбранном герое (wins/frameType — с бэкенда; у себя без них — из heroAll)
      const frameData = 'wins' in data ? data : String(data.id) === String(App.storage?.data?.id) ? HeroFrame.fromHeroList(MM.hero, data.hero) : null;
      HeroFrame.apply(playerElement.querySelector('.hero-win-frame'), Number(data.hero) > 0 ? frameData : null);

      // Плашка могла быть скрыта (рейтинг 0 при первой отрисовке) — показываем,
      // когда герой выбран и рейтинг пришёл; без героя — скрываем.
      const rankContainer = playerElement.querySelector('.rank');
      if (rankContainer) {
        const rating = Number(data.rating) || 0;
        if (Number(data.hero) > 0 && rating > 0) {
          Rank.updateRankContainer(rankContainer, rating);
          rankContainer.style.display = 'flex';
        } else {
          rankContainer.style.display = 'none';
        }
      }
    }
  }

  static PExit() {
    View.refreshCastlePlayOnly().catch((error) => App.error(error));
  }

  static PReady(data) {
    let find = document.getElementById(`PP${data.id}`);

    if (find) {
      // Готовность уже подтверждена сервером — кнопка больше не кликабельна
      find.children[2].onclick = null;

      find.children[2].firstChild.innerText = Lang.text('ready');

      find.children[2].classList.replace('party-middle-item-not-ready', 'party-middle-item-ready');

      find.children[2].classList.replace('castle-party-middle-item-not-ready', 'castle-party-middle-item-ready');
    }
  }

  static PMMActive(data) {
    CastleNAVBAR.setMode(data.mode + 1);

    MM.searchActive(data.status);
  }

  static MMQueue(value) {
    let find = document.getElementById('MMQueue');

    if (find) {
      find.innerText = value;
    }
  }

  static MMQueueV2(data) {
    View.mmQueueMap = data;
    document.querySelectorAll('.banner-count').forEach((el, idx) => {
      const keys = ['pvp', 'anderkrug', 'cte', 'm4', 'pve-ep2-red', 'custom-battle'];
      const cssKey = keys[idx];
      if (cssKey) {
        const val = View.getQueue(cssKey);
        el.textContent = val;
      }
    });
  }

  // Админ включил/выключил поиск боя; mm и mmtest шлют каждый своё — берём свой канал.
  static MMSearchState(data) {
    if (data?.mm && data.mm !== App.CURRENT_MM) return;
    Chat.setSearchClosed(!data?.enabled);
  }

  static ADMStat(data) {
    const el = document.getElementById('ADMStat');
    if (!el) return;
    const stat = data?.stat;
    if (!stat) {
      // старый бэкенд: «соединений (активных)»
      el.innerText = `${data.online}`;
      Events.admStatLines = [];
      return;
    }
    // всего (в бою / в тамбуре / отошли), подписи — в подсказке
    el.innerText = `${stat.total} (${stat.battle} / ${stat.tambour} / ${stat.away})`;
    Events.admStatLines = [
      `${Lang.text('admStatTotal')}: ${stat.total}`,
      `${Lang.text('friendStatusBattle')}: ${stat.battle}`,
      `${Lang.text('friendStatusTambour')}: ${stat.tambour}`,
      `${Lang.text('friendStatusAway')}: ${stat.away}`,
      `${Lang.text('friendStatusQueue')}: ${stat.queue}`,
      `${Lang.text('admStatCastle')}: ${stat.castle}`,
    ];
    Events.initAdmStatTooltip(el);
    Events.renderAdmStatTooltip();
  }

  // Подсказка как в чате (.chat-role-tooltip) — слева от плашки, обновляется на лету.
  static initAdmStatTooltip(el) {
    if (Events.admStatTooltip) return;
    Events.admStatTooltip = DOM({ style: 'chat-role-tooltip' });
    document.body.append(Events.admStatTooltip);
    el.addEventListener('mouseenter', () => {
      Events.admStatHover = el;
      Events.renderAdmStatTooltip();
    });
    el.addEventListener('mouseleave', () => {
      Events.admStatHover = null;
      Events.admStatTooltip.style.display = 'none';
    });
  }

  static renderAdmStatTooltip() {
    const tooltip = Events.admStatTooltip;
    const el = Events.admStatHover;
    if (!tooltip || !el) return;
    const lines = Events.admStatLines || [];
    if (!lines.length) {
      tooltip.style.display = 'none';
      return;
    }
    tooltip.replaceChildren(...lines.map((line) => DOM({ tag: 'div' }, line)));
    tooltip.style.display = 'block';
    const rect = el.getBoundingClientRect();
    tooltip.style.left = `${rect.left - tooltip.offsetWidth - 8}px`;
    tooltip.style.top = `${rect.top}px`;
  }

  static MMKick(data) {
    MM.closeTamburOnKick();

    setTimeout(() => {
      MM.searchActive(false);
    }, 1000);
    
    if ((data && Number(data.noWarning) === 1) || data?.noWarning === true) {
      return;
    }

    let body = document.createDocumentFragment();

    let button = DOM(
      {
        domaudio: domAudioPresets.bigButton,
        style: 'splash-content-button-modal',
        event: ['click', async () => Splash.hide()],
      },
      Lang.text('titleafk'),
    );

    body.append(
      DOM({ style: 'splash-modal-scope-afk-action' }),
      DOM({ style: 'title-modal' }, DOM({ style: 'title-modal-text' }, Lang.text('titleafkWindow'))),
      DOM({ style: ['castle-menu-text', 'afk-splash-text'] }, `${data.party ? Lang.text('titleafk1') : Lang.text('titleafk2')}`),
      button,
    );

    Splash.show(body);
  }

  static UChat(data) {
    Chat.onLive(data);
  }

  static UChatPinned(data) {
    Chat.onPinned(data);
  }

  static UTeamChat(data) {
    Chat.onTeam(data);
  }

  static eventForumEditMessage(data) {
    Chat.onEdited(data);
  }

  static eventForumRemoveMessage(data) {
    Chat.onRemoved(data);
  }

  // «3 в ряд»: соперник найден / события хода соперника (PvP) — обрабатывает Match3Duel
  static M3Duel(data) {
    window.dispatchEvent(new CustomEvent('m3duel', { detail: data }));
  }

  static UFriendIncoming(data) {
    View.setFriendIncomingStatus(data && Number(data.hasIncoming) == 1);
    if (View.castleActiveTab === 'friends') {
      App.api.silent(
        (result) => {
          if (View.castleActiveTab !== 'friends') return;
          View.castleFriendAll = Array.isArray(result) ? result : [];
          View.renderCastleFriendsFromCache();
        },
        'friend',
        'list',
      );
    }
  }
  
  static UFriendPresence(data) {
    View.applyFriendPresenceUpdate(data || {});
  }


  static async VCall(data) {
    const callKey = String(data?.key || '');
    const logIn = (decision, extra = {}) =>
      Voice.log('incoming', { id: Number(data?.id), key: callKey, reconnect: Number(data?.reconnect || 0), caller: Boolean(data?.isCaller), decision, ...extra });
    // 1×1 и тестовый клиент: звонок не рвётся на матч, поэтому его переподключение пускаем.
    // Так же пускаем переподключение союзника, с которым звонок друзей шёл ещё до матча:
    // этот звонок в бою не ставится на паузу, и обрыв связи не должен ждать конца боя.
    const isReconnect = Number(data?.reconnect || 0) === 1;
    const keepReconnect =
      isReconnect && (Voice.isMatchKeepCalls() || (callKey === 'friend' && Voice.isBattleFriendAlly(data?.id)));
    if ((MM.isInBattle || Voice.isBattleSuspendActive()) && callKey === 'friend' && !keepReconnect) {
      logIn('ignored-battle', { inBattle: MM.isInBattle });
      return;
    }
    const activeMatchKey = String(MM.id || '');
    if ((MM.isInTambur || MM.isInBattle) && (!activeMatchKey || callKey !== activeMatchKey) && !keepReconnect) {
      logIn('ignored-tambur');
      return;
    }
    const existing = Voice.manager?.[Number(data?.id)];
    if (existing?.peer && existing.peer.connectionState !== 'closed') {
      // Cross-calls may arrive while we already have an active/pending connection.
      // Ignore duplicate incoming invite, except glare where we must yield (see voiceGlare.js).
      const existingState = { state: existing.peer.connectionState, signaling: existing.peer.signalingState };
      if (!shouldYieldToIncomingCall(App.storage?.data?.id, data?.id, existing.peer)) {
        logIn('ignored-existing', existingState);
        return;
      }
      logIn('glare-yield', existingState);
      existing.close({ keepReconnect: true });
    }
    const forceAutoAccept = Voice.consumeMergeAutoAccept(data?.id);
    if (data.isCaller && Number(data?.reconnect || 0) !== 1 && !forceAutoAccept) {
      let playCallSoundLoop = () => {
        Sound.stop('ui-call');
        Sound.play(
          SOUNDS_LIBRARY.CALL,
          {
            id: 'ui-call',
            volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
          },
          playCallSoundLoop,
        );
      };  
	  
      // Окно предыдущего звонка закрываем до подстановки новых данных и до запуска мелодии:
      // иначе Window.close сбросит уже новый звонок (и его звук), а окно отрисуется пустым.
      if (Window.windows?.main?.id === 'wcastle-call') {
        Window.close('main');
      }

      if (!MM.isInTambur) {
		playCallSoundLoop();
	  }

      logIn('ring');
      Window.callData = data;
        
      Window.show('main', 'callWindow');
		
    } else {
      logIn('auto-accept', { merge: forceAutoAccept });
      let voice = new Voice(data.id, callKey, data.name, callKey === 'friend');

      await voice.accept(data.offer);
    }
  }
	
  static async VReady(data) {
    await Voice.ready(data.id, data.answer);
  }

  static async VCandidate(data) {
    await Voice.candidate(data.id, data.candidate);
  }

  static async VDrop(data) {
    await Voice.remoteDrop(data.id);
  }
  
  static async VMuteState(data) {
    Voice.setMutedByPeer(data?.id, Number(data?.muted || 0) === 1);
  }

  // Собеседник сообщил состояние своего микрофона (для оверлея в бою).
  static async VMicState(data) {
    VoiceGameBridge.setPeerMicState(data?.id, data?.state);
  }

  static async VFriendMerge(data) {
    const users = (data?.users || []).map((x) => Number(x?.id));
    if (MM.isInTambur || MM.isInBattle || Voice.isBattleSuspendActive()) {
      Voice.log('merge-ignored', { users, tambur: MM.isInTambur, battle: MM.isInBattle });
      return;
    }
    Voice.log('merge', { users });
    await Voice.mergeFriendCalls(data?.users || []);
  }

  static VKick() {
    Voice.destroy(true);
  }
  
  static PWBridge(data){
	  
	  if (!NativeAPI.status) {
      return;
    }

    NativeAPI.bridge(data);
	  
  }
}
