APP_VERSION = '0';

PW_VERSION = '2.9.4';

CURRENT_MM = 'mmtest'

class ParentEvent {
	
	static children;
	
	static async authorization(body){
		
		if(!body.id){
			
			if(ParentEvent.children){
				
				ParentEvent.children.close();
				
			}
			
			if('error' in body){
				
				App.error(body.error);
				
			}
			
			return;
			
		}
		
		await App.storage.set({ id: body.id, token: body.token, login: body.login, fraction: body.fraction });
		
		if(ParentEvent.children){
			
			ParentEvent.children.close();
			
		}
		
		View.show('castle');
		
	}

	static async bind(body){
		
		if(ParentEvent.children){
			
			ParentEvent.children.close();
			
		}
		
		App.notify(body);
		
	}
	
}



class Lang {
	static target = 'ru';
	static default = 'ru';
	static list = {};
	static cache = new Map();

	static async init() {
		try {
			console.log('Loading languages...');

			// Абсолютные пути
			const { ru } = await import('/content/lang/ru.js');
			const { en } = await import('/content/lang/en.js');
			//const { be } = await import('/content/lang/be.js');

			Lang.list = { ru, en/*, be*/ };
			console.log('Languages loaded successfully:', Object.keys(Lang.list));

		} catch (error) {
			console.error('Error loading language files:', error);
			throw new Error('Failed to load language files: ' + error.message);
		}

		// Загрузка языка из настроек
		if (typeof Settings !== 'undefined' && Settings.settings && Settings.settings.language) {
			if (Settings.settings.language in Lang.list) {
				Lang.target = Settings.settings.language;
				console.log('Language from settings:', Lang.target);
				Lang.clearCache(); // Очистка кеша при смене языка
				return;
			}
		}

		// Автоопределение языка по локали
		let locale = NativeAPI.getLocale();
		if (!locale && 'language' in navigator) {
			locale = navigator.language;
		}

		for (let key in Lang.list) {
			// Предполагаем, что .locale это массив
			if (Lang.list[key].locale.includes(locale)) {
				Lang.target = key;
				console.log('Language detected from locale:', locale, '->', Lang.target);
				break;
			}
		}

		console.log('Final language:', Lang.target);
		Lang.clearCache(); // Очистка кеша после инициализации
	}

	static clearCache() {
		Lang.cache.clear();
	}

	static text(word) {
		// Проверяем кеш
		const cacheKey = `${Lang.target}:${word}`;
		if (Lang.cache.has(cacheKey)) {
			return Lang.cache.get(cacheKey);
		}

		// Получаем перевод
		const targetWords = Lang.list[Lang.target]?.word;
		const defaultWords = Lang.list[Lang.default]?.word;

		let translation;
		if (targetWords && targetWords.hasOwnProperty(word)) {
			translation = targetWords[word];
		} else if (defaultWords && defaultWords.hasOwnProperty(word)) {
			translation = defaultWords[word];
		} else {
			console.warn('Translation not found:', word);
			translation = word;
		}

		// Сохраняем в кеш
		Lang.cache.set(cacheKey, translation);
		return translation;
	}

	static getTranslationMap(wordKeys) {
		const targetWords = Lang.list[Lang.target]?.word || {};
		const defaultWords = Lang.list[Lang.default]?.word || {};
		const translationMap = new Map();

		for (const key of wordKeys) {
			
			translationMap.set(key, Lang.text(key));
		}

		return translationMap;
	}

	static toggle() {
		const languages = Object.keys(Lang.list);
		const currentIndex = languages.indexOf(Lang.target);
		const nextIndex = (currentIndex + 1) % languages.length;
		Lang.target = languages[nextIndex];
		Lang.clearCache(); 
		return Lang.target;
	}

	static getNextLanguage() {
		const languages = Object.keys(Lang.list);
		const currentIndex = languages.indexOf(Lang.target);
		const nextIndex = (currentIndex + 1) % languages.length;
		return languages[nextIndex];
	}

	static heroName(heroId, skinIndex = 1) {
		if (skinIndex > 1) {
			const skinKey = `hero_${heroId}_skin_${skinIndex}_name`;
			const skinName = this.text(skinKey);

			
			if (skinName !== skinKey) {
				return skinName;
			}
		}

		// Возвращаем основное имя героя (скин 1)
		return this.text(`hero_${heroId}_name`);
	}

	static async reinitViews() {
		Chat.initView();
		MM.initView();
		await App.ShowCurrentViewAsync();
	}
}

class News {
	// создаем локальную базу данных
	static async init(){
		
		News.db = new DataBase('list',[{name:'list',options:{keyPath:'id'}}],1);
		
		await News.db.init();
		
	}
	
	static async create(text, id = 0){
		
		if(!id){
			// локальная новость с отрицательным идентификатором
			id = -Date.now();
			
		}
		
		id = Number(id);
		
		if(await News.db.get('list',id)){
			
			return;
			
		}
		// id - угикальный ключ, text - текст, status - прочитано да/нет, иначе уведомление? 
		await News.db.add('list',{id:id,text:text,status:0});
		
	}
	
	static async update(){
		
		//let request = await App.api.request('user','news');
		let request = [{id:'Привет мир!',text:'Тестовая новость с сервера'}]; // демо данные
		
		for(let item of request){
			
			News.create(item.id,item.text);
			
		}
		
	}
	// выводим все новости
	static async view(){
		
		let list = await News.db.getAll('list'), notifications = 0;
		
		for(let item of list){
			
			if(!item.status){
				
				notifications++;
				
			}
			
		}
		// list - список новостей, notifications - количество не прочитанных новостей (уведомления)
		return {list:list,notifications:notifications};
		
	}
	// вешаем событие на мышь или любой другой способ, чтобы убедиться, что пользователь прочитал новость
	static async onStatus(id){
		
		await News.set(id,{status:1});
		
	}
	
	static async set(id,object){
		
		if('id' in object){
			
			throw 'Нельзя перезаписать идентификатор';
			
		}
		
		id = Number(id);
		
		let item = await News.db.get('list',id);
		
		if(!item){
			
			throw 'Новость не найдена';
			
		}
		
		await News.db.add('list',Object.assign(item,object));
		
	}
	
}

window.addEventListener('DOMContentLoaded', () => {
	
	window.addEventListener('message',(event) => {

		if (event.data == '') {
			return;
		}
		
		if( !('action' in event.data) ){
			
			return;
			
		}
		
		if(event.data.action in ParentEvent){
			
			ParentEvent[event.data.action](event.data.body);
			
		}
		
		console.log('event.data',event.data);
		
	});

	Splash.init();

	NativeAPI.init();

	NativeAPI.update((data) => {

		if (View.updateProgress) {

			Splash.hide();

		}

		if (data.update) {

			View.updateProgress = View.progress();

			View.updateProgress.firstChild.style.width = data.total + '%';

			View.updateProgress.lastChild.innerText = `${data.title} ${data.total}%...`;

		}

	});

	let testRadminConnection = async () => {
		let hasConnection = await PWGame.testServerConnection(PWGame.gameServerIps[PWGame.RADMIN_GAME_SERVER_IP]);
		if (hasConnection) {
			PWGame.radminHasConnection = true;
		}
	}
	let testMainConnection = async () => {
		let hasConnection = await PWGame.testServerConnection(PWGame.gameServerIps[PWGame.MAIN_GAME_SERVER_IP]);
		if (hasConnection) {
			PWGame.mainServerHasConnection = true;
		}
	}
	setTimeout(_ => {
		testRadminConnection();
		testMainConnection();
	}, 3000);

	Settings.init().then(() => {

		Lang.init().then(() => {
			
			App.findBestHostAndInit();

		})

	});
});

class DataBase {

	constructor(name, structure, version = 1) {

		if (!('indexedDB' in window)) {

			throw 'Отсутствует поддержка IndexedDB!';

		}

		this.name = name;

		this.structure = structure;

		this.version = version;

	}

	async init() {

		let request = indexedDB.open(this.name, this.version);

		request.addEventListener('upgradeneeded', async (event) => await this.upgrade(event));

		return new Promise((resolve, reject) => {

			request.addEventListener('success', event => {

				this.link = event.target.result;

				resolve();

			});

			request.addEventListener('error', reject);

		});

	}

	async add(name, value, key) {

		let transaction, table, result;

		transaction = this.link.transaction(name, 'readwrite');

		table = transaction.objectStore(name);

		result = table.put(value, key);

		return new Promise((resolve, reject) => {

			result.addEventListener('success', event => {

				resolve(event.target.result);

			});

			//transaction.addEventListener('complete',resolve);

			transaction.addEventListener('error', reject);

		});

	}

	async get(name, key) {

		let transaction, table, result;

		transaction = this.link.transaction(name, 'readonly');

		table = transaction.objectStore(name);

		result = table.get(key);

		return await new Promise((resolve, reject) => {

			result.addEventListener('success', event => {

				resolve(event.target.result);

			});

			result.addEventListener('error', reject);

		});

	}

	async getAll(name, key) {

		let transaction, table, result;

		transaction = this.link.transaction(name, 'readonly');

		table = transaction.objectStore(name);

		result = table.getAll(key);

		return new Promise((resolve, reject) => {

			result.addEventListener('success', event => {

				resolve(event.target.result);

			});

			result.addEventListener('error', reject);

		});

	}

	async getIndexAllSync(name, nameIndex, nameKey, callback) {

		let transaction, table, index, result;

		transaction = this.link.transaction(name, 'readonly');

		table = transaction.objectStore(name);

		index = table.index(nameIndex);

		result = index.getAll(nameKey);

		result.addEventListener('success', event => {

			callback(event.target.result);

		});

		result.addEventListener('error', (error) => {

			throw error;

		});

		// нужно работать с курсором для экономии памяти!!!, иначе при большом количестве информации её будет невозможно вытащить... будет ошибка при попытке получения большого массива
		//let request = books.openCursor(); // курсору нужно передать инфу о количестве штук, как я понимаю, по умолчанию он по 1 записи выдает
		// вызывается для каждой найденной курсором книги
		//request.onsuccess = function() {

		//let cursor = request.result;

		//if (cursor) {

		//let key = cursor.key; // ключ книги (поле id)

		//let value = cursor.value; // объект книги

		//console.log(key, value);

		//cursor.continue();

		//} else {

		//console.log("Книг больше нет");

		//}};

	}

	async getIndexAll(name, nameIndex, nameKey) {

		let transaction, table, index, result;

		transaction = this.link.transaction(name, 'readonly');

		table = transaction.objectStore(name);

		index = table.index(nameIndex);

		result = index.getAll(nameKey);

		return new Promise((resolve, reject) => {

			result.addEventListener('success', event => {

				resolve(event.target.result);

			});

			result.addEventListener('error', reject);

		});

	}

	async multi(object) {

		let requests = new Array();

		for (let table in object) {

			switch (object[table].method) {

				case 'get': requests.push(this.get(table, object[table].id)); break;

				case 'getIndexAll': requests.push(this.getIndexAll(table, object[table].key, object[table].id)); break;

				default: throw `Неизвестный метод ${object[table].method}`; break;

			}

		}

		let i = 0, result = await Promise.all(requests);

		for (let table in object) {

			object[table] = result[i];

			i++;

		}

		return object;

	}

	async deleteIndexAll(name, nameIndex, nameKey) {

		let keys = await this.getIndexAll(name, nameIndex, nameKey);

		if (!keys) {

			return;

		}

		for (let item of keys) {

			await this.delete(name, 'id');

		}

		return true;

	}

	async delete(name, key) {

		let transaction, table, result;

		transaction = this.link.transaction(name, 'readwrite');

		table = transaction.objectStore(name);

		result = table.delete(key);

		return new Promise((resolve, reject) => {

			result.addEventListener('success', event => {

				resolve(event);

			});

			result.addEventListener('error', reject);

		});

	}

	async clear(name) {

		let transaction = this.link.transaction(name, 'readwrite');

		return transaction.objectStore(name).clear();

	}

	async upgrade(event) {

		let db = event.target.result;

		if (!this.structure) {

			throw `Для создания базы-данных, необходима разметка структуры`;

		}

		let objectStore, table, index;

		for (objectStore of this.structure) {

			let find = false;

			try {

				for (let value of db.objectStoreNames) { // DOMStringList метод contains нельзя использовать, устарело.

					if (value == objectStore.name) {

						find = true;

						break;

					}

				}

				if (find) {

					if ('clear' in objectStore) {

						db.deleteObjectStore(objectStore.name);

					}
					else {

						continue;

					}

				}

				table = db.createObjectStore(objectStore.name, objectStore.options);

				if (objectStore.indexes) {

					for (index of objectStore.indexes) {

						table.createIndex(index.name, index.path);

					}

				}

			}
			catch (e) {

				console.log(`Ошибочка, которую мы скрыли: ${e} :ибо как проверить на наличие таблицы? ;>`);

			}

		}

	}

}

class Store {

	static async init() {

		Store.db = new DataBase('Storage', [{ name: 'keys', options: { keyPath: 'identify' }, indexes: [{ name: 'objects', path: 'object' }] }], 5);

		return await Store.db.init();

	}

	static async get(object, key) {

		let result = await Store.db.get('keys', `${object}.${key}`);

		return (result) ? result.value : false;

	}

	static async getAll(object) {

		let keys = await Store.db.getIndexAll('keys', 'objects', object);

		if (!keys.length) {

			return keys;

		}

		let result = new Object();

		for (let item of keys) {

			result[item.key] = item.value;

		}

		return result;

	}

	constructor(object) {

		this.object = object;

		this.local = new Object();

	}

	async init(defaultObject) {

		let result, object;

		result = await Store.db.getIndexAll('keys', 'objects', this.object);

		if (result.length) {

			for (object of result) {

				this.local[object.key] = object.value;

			}

		}
		else {

			await this.set(defaultObject);

		}

	}

	get data() {

		return this.local;

	}

	async set(object) {

		for (let key in object) {

			await Store.db.add('keys', { identify: `${this.object}.${key}`, object: this.object, key: key, value: object[key] });

			this.local[key] = object[key];

		}

	}

	async getAll(object) {

		let keys = await Store.db.getIndexAll('keys', 'objects', object);

		if (!keys.length) {

			return false;

		}

		let result = new Object();

		for (let item of keys) {

			result[item.key] = item.value;

		}

		return result;

	}

	static async delete(object) {

		let keys = await Store.db.getIndexAll('keys', 'objects', object);

		if (!keys) {

			return;

		}

		for (let item of keys) {

			await Store.db.delete('keys', item.identify);

		}

	}

}

class Api {

	constructor(host, bestHost, events) {

		if( !('WebSocket' in window) ) {

			throw 'Отсутствует поддержка WebSocket';
			
		}
		
		if(!Array.isArray(host)){
			
			throw 'Необходим массив хостов';
			
		}
		
		if(!host.length){
			
			throw 'Не указан хост';
			
		}
		
		this.WebSocket;

		this.host = host;

		this.MAIN_HOST = this.host[bestHost];
		
		this.DISCONNECT_LAST_DATE_LIMIT_MS = 30000; // плюсуем неудачное соединение в указанном диапазоне времени
		
		this.DISCONNECT_LAST_DATE = Date.now(); // метка времени с последнего неудачного соединения 

		this.DISCONNECT_TOTAL = 0; // количество неудачных соединений
		
		this.DISCONNECT_LIMIT = 3; // лимит неудачных соединений, чтобы перейти на другой хост (DISCONNECT_LIMIT * RECONNECT_TIME)
		
		this.RECONNECT_TIME = 1000; // через сколько делаем повторное соединение (1000 = 1 секунда)

		this.awaiting = new Object();

		this.events = (events) ? events : new Object();

	}

	async init(){
		
		await this.connect();
		
	}

	async connect(delay = 0){
		
		return new Promise((resolve,reject) => {
			
			setTimeout( async () => {
				
				console.log(`Попытка соединения ${this.MAIN_HOST} (${this.DISCONNECT_TOTAL})...`);
				
				if(this.WebSocket){
					
					if(this.WebSocket.readyState == 1){
						
						return resolve();
						
					}
					
					await this.disconnect();
					
				}
				
				if(this.DISCONNECT_TOTAL >= this.DISCONNECT_LIMIT){
					
					this.hostChange();
					
				}
				
				this.WebSocket = new WebSocket(`${this.MAIN_HOST}/${App.storage.data.token}`);
				
				this.WebSocket.onmessage = (event) => this.message(event.data);
				
				this.WebSocket.onerror = (event) => {
					console.log(`Разрыв соединения ${this.MAIN_HOST}...`,event);
					App.error(`Разрыв соединения, подождите... [${this.DISCONNECT_TOTAL}]`,event);
				};
				
				this.WebSocket.onclose = () => {
					
					this.connect(this.RECONNECT_TIME);
					
					reject();
					
				};
				
				this.WebSocket.onopen = () => {
					
					this.WebSocket.onclose = () => this.connect(this.RECONNECT_TIME);
					
					console.log(`Успешно подключились к ${this.MAIN_HOST}...`);
					
					if (this.MAIN_HOST != this.host[0]) {
						App.ShowCurrentView();
					}
					
					resolve();
					
				};
				
				// this.WebSocket.onerror = reject;
				
			},delay);
			
		});
		
	}
	
	async disconnect(){
		console.log(`Закрываем соединение ${this.MAIN_HOST}...`);
		App.error(`Закрыто соедниение... Выполняется переподключение, подождите... [${this.DISCONNECT_TOTAL}]`);
		if(!this.WebSocket){
			
			return;
			
		}
		
		if( (Date.now() - this.DISCONNECT_LAST_DATE) < this.DISCONNECT_LAST_DATE_LIMIT_MS){
			
			this.DISCONNECT_TOTAL++;
			
		}
		
		this.DISCONNECT_LAST_DATE = Date.now();
		
		return new Promise((resolve,reject) => {
			
			if(this.WebSocket.readyState == 3){
				
				return resolve();
				
			}
			
			this.WebSocket.onclose = resolve;
			
			// this.WebSocket.onerror = reject;
			
			this.WebSocket.close();
			
		});
		
	}
	
	hostChange(){
		
		this.DISCONNECT_TOTAL = 0;
		
		if(this.host.length == 1){
			
			return;
			
		}
		
		let currentHost = 0;
		for (let i = 0; i < this.host.length; ++i) {
			if(this.MAIN_HOST == this.host[i]){
				currentHost = i;
				break;
			}
			}
		App.error(`Подождите, подключение восстанавливается [${currentHost}]`);
			
		this.MAIN_HOST = this.host[(currentHost + 1) % this.host.length];
		
	}

	async message(body) {

		let json = JSON.parse(body);

		if (!json) {

			return;

		}

		if ('response' in json) {

			let { request, data, error } = json.response;

			if (!(request in this.awaiting)) {

				return;

			}

			if (error) {

				this.awaiting[request].reject(error);

			}
			else {

				this.awaiting[request].resolve(data);

			}

			delete this.awaiting[request];

		}
		else if ('from' in json) { // request

			let { action, data } = json.from;

			if ('queue' in json) {

				try {

					this.WebSocket.send(JSON.stringify({ queue: json.queue }));

				}
				catch (error) {

					console.log('API (queue)', error);

				}

			}

			if (action in this.events) {
				
				try {

					this.events[action](data);

				}
				catch (error) {

					console.log('API (events/action)', error);

				}

			}

		}
		else {

			throw `Неизвестная структура сообщения -> ${JSON.stringify(json)}`;

		}

	}

	async request(object, method, data) {

		for (let key in this.awaiting) {

			if ((this.awaiting[key].object == object) && (this.awaiting[key].method == method)) {

				throw `Запрос уже выполнен, пожалуйста дождитесь ответа от сервера (15 секунд)... | ${method} -> ${object}`;

			}

		}

		let identify = Date.now();

		try {

			await this.say(identify, object, method, data);

		}
		catch (error) {

			throw `Запрос не выполнен, ошибка интернет соединения`;

		}

		return await new Promise((resolve, reject) => {

			let rejectTimerId = setTimeout(() => {

				delete this.awaiting[identify];

				reject(`Ошибка интернет соединения, время ожидания ответа на запрос ${object} -> ${method} истекло`);

			}, 15000);

			this.awaiting[identify] = {
				object: object, method: method, resolve: data => {

					clearTimeout(rejectTimerId);

					resolve(data);

				}, reject: error => {

					clearTimeout(rejectTimerId);

					reject(error);

				}
			};

		});

	}

	async silent(callback, object, method, data, infinity = false) {

		let identify = `${method}${Date.now()}`; // если у нас более одного silent, то они перебивают друг друга так как это не async

		try {

			await this.say(identify, object, method, data);

		}
		catch (error) {

			if (infinity) {

				setTimeout(() => this.silent(callback, object, method, data, true), 3000);

			}

			return;

		}

		let timerId = setTimeout(() => {

			delete this.awaiting[identify];

			if (infinity) {

				this.silent(callback, object, method, data, true);

			}

		}, 15000);

		this.awaiting[identify] = {
			object: object, method: method, resolve: (data) => {

				clearTimeout(timerId);

				callback(data, false);

			}, reject: (error) => {

				clearTimeout(timerId);

				callback(false, error);

			}
		};

		return;

	}

	async ghost(object, method, data) {

		try {

			await this.say(0, object, method, data);

		}
		catch (error) {


		}

		return;

	}

	async say(request, object, method, data = '', retryCount = 0) {

		if (this.WebSocket.readyState === this.WebSocket.OPEN) {

			this.WebSocket.send(JSON.stringify({ token: App.storage.data.token, request: request, object: object, method: method, data: data, version: `${PW_VERSION}.${APP_VERSION}` }));

		} else {

			if (retryCount < 5) {
				setTimeout(() => this.say(request, object, method, data, retryCount + 1), 3000);
			}

		}
	}

}

class CastleNAVBAR {

	static state = false;

	static mode = 0;
	
	static stateDefaultMode = 0;

	static init() {

		let items = [
			'castle-button-play-l1',
			'castle-button-play-4',
			'castle-button-play-5',
			'castle-button-play-6',
			'castle-button-play-7',
			'castle-button-play-3',
			'castle-button-play-mode',
			'castle-button-play-1',
			'castle-button-play-2',
			'castle-button-play-8',
			'castle-button-play-9',
			'castle-button-play-m1',
			'castle-button-play-m2',
			'castle-button-play-m3',
			'castle-button-play-m4',
			'castle-button-play-m5',
			'castle-button-play-m6',
			'castle-button-play-division',
			'castle-button-play-karma'

		];

		CastleNAVBAR.body = DOM({ style: 'castle-button-play' });

		for (let item of items) {

			CastleNAVBAR.body.append(DOM({ style: item }));

		}

		CastleNAVBAR.body.children[3].onclick = () => {

		
			
		}

		CastleNAVBAR.body.children[4].onclick = () => {

			
		}

		CastleNAVBAR.body.children[5].innerText = Lang.text('fight');
		/*
		CastleNAVBAR.body.children[5].onclick = () => {
			
			if(CastleNAVBAR.state){
				
				CastleNAVBAR.cancel();
				
			}
			else{
				
				CastleNAVBAR.play();
				
			}
			
		}
		*/
		CastleNAVBAR.body.children[9].onclick = () => {

			CastleNAVBAR.viewMode();

		}

		CastleNAVBAR.body.children[9].append(DOM({ style: 'castle-button-play-queue', title: 'Очередь игроков матчмейкинга на данный режим игры' }));
		
		CastleNAVBAR.body.children[11].append(DOM({style:'castle-button-play-queue-mode'}));
		
		CastleNAVBAR.body.children[11].onclick = () => {

			CastleNAVBAR.setMode(1);
			
		};
		
		CastleNAVBAR.body.children[12].append(DOM({style:'castle-button-play-queue-mode'}));

		CastleNAVBAR.body.children[12].onclick = () => {

			CastleNAVBAR.setMode(2);
			
		};
		
		CastleNAVBAR.body.children[13].append(DOM({style:'castle-button-play-queue-mode'}));

		CastleNAVBAR.body.children[13].onclick = () => {

			CastleNAVBAR.setMode(3);
			
		};
		
		CastleNAVBAR.body.children[14].append(DOM({style:'castle-button-play-queue-mode'}));

		CastleNAVBAR.body.children[14].onclick = () => {

			CastleNAVBAR.setMode(4);
			
		};
		
		CastleNAVBAR.body.children[15].append(DOM({style:'castle-button-play-queue-mode'}));
		
		CastleNAVBAR.body.children[15].onclick = () => {

			CastleNAVBAR.setMode(5);
			
		};
		
		CastleNAVBAR.body.children[16].append(DOM({style:'castle-button-play-queue-mode'}));
		
		CastleNAVBAR.body.children[16].onclick = () => {

			CastleNAVBAR.setMode(6);
			
		};
		
		CastleNAVBAR.body.children[18].title =
      		'Карма — поведение игрока и его "полезность" в бою.\n' +
      		'Она может повышаться и понижаться, в зависимости от боёв.';
    	CastleNAVBAR.body.children[18].style.pointerEvents = 'auto';
    	CastleNAVBAR.body.children[18].style.zIndex = '4';
    	CastleNAVBAR.body.children[18].append(DOM({ tag: 'div' }));
		
		return CastleNAVBAR.body.children[5];
		
	}
	
	static defaultMode(id){
		
		if(!id){
			
			if(CastleNAVBAR.stateDefaultMode){
				
				CastleNAVBAR.stateDefaultMode = 0;
				
			}
			
			return;
			
		}
		
		if( (CastleNAVBAR.stateDefaultMode) && (CastleNAVBAR.stateDefaultMode == id) ){
			
			return;
			
		}
		
		if(CastleNAVBAR.state){
			
			return;
			
		}
		
		CastleNAVBAR.setMode(id);
		
		CastleNAVBAR.stateDefaultMode = id;
		
	}

	static play() {

		if (CastleNAVBAR.state) {

			return;
			
		}

		CastleNAVBAR.state = true;

		CastleNAVBAR.body.children[0].style.display = 'block';

		CastleNAVBAR.body.children[5].innerText = Lang.text('cancel');;

		//CastleNAVBAR.body.children[5].style.fontSize = '1.1vw';

		CastleNAVBAR.body.children[1].style.filter = 'grayscale(80%)';

		CastleNAVBAR.body.children[2].style.filter = 'grayscale(80%)';

		CastleNAVBAR.body.children[3].style.filter = 'grayscale(70%)';

		CastleNAVBAR.body.children[4].style.filter = 'grayscale(70%)';
		
	}
	
	static karma(id) {

    let karma = 0;

    if (id >= 75) {
      karma = 75;
    } else if (id >= 50) {
      karma = 50;
    }

    if (karma) {
      const el = CastleNAVBAR.body.children[18];
      el.style.display = 'flex';
      el.firstChild.innerText = `>${karma}`;

      
      el.title =
        'Карма — поведение игрока и его "полезность" в бою.\n' +
        'Она может повышаться и понижаться, в зависимости от боёв.\n' +
        `Текущий порог: >${karma}`;
    }
  }
	
	static division(id) {
		
		let division = Division.get(id);
		
		CastleNAVBAR.body.children[17].style.backgroundImage =  `url(content/ranks/${division.icon}.webp)`;
		
		CastleNAVBAR.body.children[17].title = 'Дивизия — группа игроков под одним званием,\nкоторая играет примерно на равном винрейте матчмейкинга.';
		
		CastleNAVBAR.body.children[17].style.display = 'block';
		
	}

	static cancel() {

		if (!CastleNAVBAR.state) {

			return;

		}

		CastleNAVBAR.state = false;

		CastleNAVBAR.body.children[0].style.display = 'none';

		CastleNAVBAR.body.children[5].innerText = Lang.text('fight');

		//CastleNAVBAR.body.children[5].style.fontSize = '1.4vw';

		CastleNAVBAR.body.children[1].style.filter = 'grayscale(0)';

		CastleNAVBAR.body.children[2].style.filter = 'grayscale(0)';

		CastleNAVBAR.body.children[3].style.filter = 'grayscale(0)';

		CastleNAVBAR.body.children[4].style.filter = 'grayscale(0)';
		
		CastleNAVBAR.body.children[17].style.display = 'none';
		
		CastleNAVBAR.body.children[18].style.display = 'none';

	}

	static viewMode() {

		CastleNAVBAR.body.children[5].style.display = 'none';

		CastleNAVBAR.body.children[10].style.display = 'block';

		CastleNAVBAR.body.children[11].style.display = 'block';

		CastleNAVBAR.body.children[12].style.display = 'block';

		CastleNAVBAR.body.children[13].style.display = 'block';

		CastleNAVBAR.body.children[14].style.display = 'block';
		
		CastleNAVBAR.body.children[15].style.display = 'block';
		
		CastleNAVBAR.body.children[16].style.display = 'block';
		
	}

	static setMode(type) {
		
		let modeSelect = (type - 1);
		
		if(CastleNAVBAR.mode != modeSelect){
			
			CastleNAVBAR.body.children[9].firstChild.innerText = '';
			
		}

		CastleNAVBAR.mode = modeSelect;

		CastleNAVBAR.body.children[5].style.display = 'flex'; //починил кнопку

		let background = window.getComputedStyle(CastleNAVBAR.body.children[`1${type}`], null).getPropertyValue('background-image');

		CastleNAVBAR.body.children[6].style.backgroundImage = background;

		CastleNAVBAR.body.children[10].style.display = 'none';

		CastleNAVBAR.body.children[11].style.display = 'none';

		CastleNAVBAR.body.children[12].style.display = 'none';

		CastleNAVBAR.body.children[13].style.display = 'none';
		
		CastleNAVBAR.body.children[14].style.display = 'none';
		
		CastleNAVBAR.body.children[15].style.display = 'none';
		
		CastleNAVBAR.body.children[16].style.display = 'none';
		
	}

	static queue(data) {

		let queue = 0;

		if (CastleNAVBAR.mode in data.mode) {

			if (data.mode[CastleNAVBAR.mode]) {

				queue = data.mode[CastleNAVBAR.mode];
				
			}
			
		}

		CastleNAVBAR.body.children[9].firstChild.innerText = ((queue) ? queue : '');
		
		for(let item of [{child:11,mode:0},{child:12,mode:1},{child:13,mode:2},{child:14,mode:3},{child:15,mode:4},{child:16,mode:5}]){
			
			CastleNAVBAR.body.children[item.child].firstChild.innerText = ( ( (item.mode in data.mode) && (data.mode[item.mode]) ) ? data.mode[item.mode] : '');
			
		}
		
	}

}

class View {
	static mmQueueMap = {};

	static getQueue(cssKey) {
  		const map = {
    		pvp: 0,
    		anderkrug: 1,
   		 	cte: 2,
    		m4: 3,
    		'pve-ep2-red': 4,
    		'custom-battle': 5
  		};
  			const index = map[cssKey];
  			return (View.mmQueueMap.mode && View.mmQueueMap.mode[index]) || '-';
		}
	static activeTemplate = false;

	static activeAnimation = false;

	static animationIsEnabled = false;

	static defaultAnimation = { transform: ['scale(1.1)', 'scale(1)'], opacity: [0, 1], backdropFilter: ['blur(0)', 'blur(1cqh)'] };

	static defaultOptionAnimation = { duration: 150, fill: 'both', easing: 'ease-out' };

	static updateProgress = false;

	static setCss(name = 'content/style.css') {

		let css = DOM({ tag: 'link', rel: 'stylesheet', href: name });

		document.head.appendChild(css);

	}

	static async show(method, value, value2, value3) {

		if (!(method in View)) {

			return;

		}

		Window.close('main');

		Castle.toggleRender(Castle.RENDER_LAYER_LAUNCHER, method == 'castle');

		try {

			var template = await View[method](value, value2, value3);

		}
		catch (error) {

			App.error(error);

			return;

		}

		if (View.active) {

			if (View.animationIsEnabled) {

				View.activeAnimation.reverse();

				View.activeAnimation.addEventListener('finish', () => {

					View.active.remove();

					View.active = template;

					View.activeAnimation = template.animate(View.defaultAnimation, View.defaultOptionAnimation);

					document.body.append(template);

				});

			} else {

				View.active.remove();

				View.active = template;

				document.body.append(template);

			}

		}
		else {

			if (View.animationIsEnabled) {

				View.active = template;

				View.activeAnimation = template.animate(View.defaultAnimation, View.defaultOptionAnimation);

				document.body.append(template);

			} else {

				View.active = template;

				document.body.append(template);

			}

		}
		
	}
	
	static authorization() {
		let numEnterEvent = ['keyup', async (event) => {
			if (event.code === 'Enter' || event.code === 'NumpadEnter') {
				App.authorization(login, password);
			}
		}];

		let login = DOM({ tag: 'input', placeholder: Lang.text('nickname'), event: numEnterEvent }), password = DOM({ tag: 'input', placeholder: Lang.text('password'), type: 'password', event: numEnterEvent });
	// Создаем выпадающий список языков
		const languageSelect = DOM({
			tag: 'select',
			id: 'lang_select',
			style: 'language-select',
			event: ['change', async (e) => {
				const newLanguage = e.target.value;
				Lang.target = newLanguage;
				Settings.settings.language = newLanguage;
				App.error(`${Lang.text('LangTarg')}: ${Lang.list[newLanguage].name}`);
				// Перезагружаем страницу для применения языка
				await Lang.reinitViews();
			}]
		});

		// Заполняем выпадающий список языками
		Object.entries(Lang.list).forEach(([code, langData]) => {
			languageSelect.appendChild(
				DOM({
					tag: 'option',
					value: code,
					selected: code === Lang.target,
					text: langData.name
				})
			);
		});
		let authorizationForm = DOM({ style: 'login_box' }, DOM({ style: 'login-box-forma' }, DOM({ tag: 'div' }, DOM({ tag: 'img', style: 'login-box-forma-logo', src: 'content/img/logo_classic.webp' })),

			DOM({ style: 'language-select-container' },
					languageSelect
				),
			DOM({ style: 'login-box-forma-inputs' },
				login,
				password,
				DOM({ style: 'login-box-forma-buttons' }, 
					DOM({ style: 'login-box-forma-button', event: ['click', () => App.authorization(login, password)] }, Lang.text('login')), 
					DOM({ style: 'login-box-forma-button', event: ['click', () => View.show('registration')]}, Lang.text('registration'))
				),
				DOM({ style: 'login-box-forma-buttons' }, 
					DOM({style: ['login-box-forma-button', 'steamauth'], event:['click',() => Window.show('main', 'steamauth')]}, Lang.text('authorizationSteam'))
				),
			)), DOM({ style: 'author' }, `Prime World: Classic v.${PW_VERSION}.${APP_VERSION}`));

		return authorizationForm;
	}

	static registration() {
		let numEnterEvent = ['keyup', async (event) => {
			if (event.code === 'Enter' || event.code === 'NumpadEnter') {
				App.registration(fraction, invite, login, password, password2);
			}
		}];

		let fraction = DOM({ tag: 'select' },
			DOM({ tag: 'option', value: 0, disabled: true, selected: true }, Lang.text('fraction')),
			DOM({ tag: 'option', value: 1 }, Lang.text('adornia')),
			DOM({ tag: 'option', value: 2 }, Lang.text('docts'))
		);

		let tgBotUrl = 'https://t.me/primeworldclassic_bot';

		let telegramBotLink = DOM({ style: 'telegram-bot' , tag: 'a', target: '_blank', href: tgBotUrl, event: ['click', (e) => NativeAPI.linkHandler(e)]});

		let invite = DOM({ tag: 'input', placeholder: Lang.text('code'), event: numEnterEvent });

		let inviteContainer = DOM({ style: 'invite-input' }, invite, telegramBotLink)

		let login = DOM({ tag: 'input', placeholder: Lang.text('nickname'), event: numEnterEvent });

		let password = DOM({ tag: 'input', placeholder: Lang.text('password'), type: 'password', event: numEnterEvent });

		let password2 = DOM({ tag: 'input', placeholder: Lang.text('passwordAgain'), type: 'password', event: numEnterEvent });

		return DOM({ style: 'login_box' }, DOM({ style: 'login-box-forma' },

			DOM({ style: 'login-box-forma-inputs' },
				fraction,
				inviteContainer,
				login,
				password,
				password2,
				DOM({ style: 'login-box-forma-buttons' },
					DOM({ style: 'login-box-forma-button', event: ['click', () => App.registration(fraction, invite, login, password, password2)] }, Lang.text('registration1')),
					DOM({ style: 'login-box-forma-button', event: ['click', () => View.show('authorization')] }, Lang.text('back'))
				)
			),
			DOM({ style: 'login-box-forma-right' }, DOM({ tag: 'img', style: 'login-box-forma-logo', src: 'content/img/logo_classic.webp' }),DOM({style:'login-box-form-invite-text'},`Получить инвайт-код через QR-код`), DOM({ tag: 'img', style: 'login-box-forma-logo', src: 'content/img/pwclassicbot.png' }))

		), DOM({ style: 'author' }, `Prime World: Classic v.${PW_VERSION}.${APP_VERSION}`));

	}

	static progress() {

		let body = DOM({ style: 'progress' }, DOM({ style: 'animation1' }), DOM());

		Splash.show(body, false);

		return body;

	}

	static async castle() {
		
		document.body.classList.add('noselect');

		View.setCss('content/castle.css');

		let body = DOM({ tag: 'div', id: 'castle-body' });
		let backgroundImage = DOM({ tag: 'div', id: 'castle-background-img' });

		if (!Castle.canvas) {
			Castle.canvas = DOM({ tag: 'canvas', id: 'castle-game-surface' });
		}

		try {

			if (!Castle.gl) {
				await Castle.initDemo(App.storage.data.fraction == 1 ? 'ad' : 'doct', Castle.canvas);
			}

		}
		catch (error) { // если замок не работает на устройстве, тогда рендерим старую версию главной страницы

			App.error(error);

		}
		
		body.append(backgroundImage,Castle.canvas);
		
		//body.append(await View.castleQuest());
		
		try{
			
			let castlePlay = await View.castlePlay();
			
			body.append(castlePlay);
			
		}
		catch(error){
			
			if(String(error).search(new RegExp(`session is not valid`, 'i')) != -1){
				
				await App.exit();
				
				NativeAPI.reset();
				
				return;
				
			}
			
			console.log(error);
			
		}
		
		body.append(View.castleChat());
		
		try{
			
			let castleHeroes = await View.castleHeroes();
			
			body.append(castleHeroes);
			
		}
		catch(e){
			
			console.log(e);
			
		}
		
		body.append(View.castleSettings());
		
		setTimeout(() => {

			Chat.scroll();

		}, 1500);
		
		return body;

	}
	/*
static async quest(questId, cloneNode, item) {
  let root = document.querySelector('#wquest');
  if (root) {
    if (root.__wquestEscDown)  document.removeEventListener('keydown', root.__wquestEscDown, true);
    if (root.__wquestEscUp)    document.removeEventListener('keyup',   root.__wquestEscUp,   true);
    root.remove();
  }

  root = DOM({ id: 'wquest' });
  document.body.appendChild(root);

  const giverId = (item.giverId ?? item.questGiverId ?? item.heroId);
  const candidates = [`content/hero/${giverId}/1.webp`];

  const pickExistingImage = (urls) => new Promise(res => {
    const tryNext = (i=0) => { if (i>=urls.length) return res(null);
      const im = new Image(); im.onload=()=>res(urls[i]); im.onerror=()=>tryNext(i+1); im.src=urls[i]; };
    tryNext();
  });

  const parseRewards = (rewardStr) => {
    const out = []; const s = String(rewardStr || '').toLowerCase();
    if (s.includes('кристал') || s.includes('прайм')) {
      const m = s.match(/\+?\s*(\d+)\s*(?:кристал|кристалл|кристаллов|прайм)/i);
      const hasN = /(^|\s)n(\s|$)/i.test(rewardStr) || /n\s*количество/i.test(rewardStr);
      out.push({ type:'prime', label: m ? String(+m[1]) : (hasN ? 'N' : '—') });
    }
    if (s.includes('звезд') || s.includes('звёзд') || s.includes('звезда')) {
      const m = s.match(/\+?\s*(\d+)\s*зв/i); out.push({ type:'star', label: m ? String(+m[1]) : '—' });
    }
    if (!out.length) { const m = s.match(/\d+/); if (m) out.push({ type:'generic', label:String(+m[0]) }); }
    return out;
  };

  const content = DOM({ tag:'div' }); content.classList.add('wquest__content');

  const titlebar = DOM({ tag:'div' }); titlebar.classList.add('wquest__titlebar');
  const h3 = DOM({ tag:'h3' }); h3.classList.add('wquest__title'); h3.textContent = item.title || 'Задание';

  const closeBtn = DOM({ tag:'button' });
  closeBtn.type = 'button';
  closeBtn.classList.add('close-button', 'wquest__close');
  closeBtn.setAttribute('aria-label', 'Закрыть');
  closeBtn.style.backgroundImage = closeBtn.style.backgroundImage || "url('content/icons/close-cropped.svg')";

  titlebar.appendChild(h3);
  titlebar.appendChild(closeBtn);

  const body = DOM({ tag:'div' }); body.classList.add('wquest__body'); body.textContent = item.description || '';

  const objective = DOM({ tag:'div' }); objective.classList.add('wquest__objective');
  const objText = DOM({ tag:'div' }); objText.classList.add('wquest__objective-text');
  objText.textContent = item.target || 'Выполните условие задания.';
  objective.appendChild(objText);

  const tokens = parseRewards(item.reward);
  const rewards = DOM({ tag:'div' }); rewards.classList.add('wquest__rewards');
  tokens.forEach(t => {
    const chip = DOM({ tag:'div' }); chip.classList.add('wquest__chip');
    const icon = DOM({ tag:'div' }); icon.classList.add('wquest__chip-icon');
    const val  = DOM({ tag:'div' }); val.classList.add('wquest__chip-value'); val.textContent = t.label;
    chip.appendChild(icon); chip.appendChild(val);
    rewards.appendChild(chip);
  });

 const avatar = DOM({ tag:'div' });
avatar.classList.add('wquest__avatar');

const fallback1 = `content/hero/${giverId}/1.webp`; 
const fallback2 = `content/img/queue/321.png`; 

pickExistingImage(candidates).then(url => {
  const mainImg = url || fallback1;

  avatar.style.backgroundImage = `url("${mainImg}"), url("${fallback2}")`;
  avatar.style.backgroundSize = 'cover, contain';        
  avatar.style.backgroundPosition = 'center, center';    
  avatar.style.backgroundRepeat = 'no-repeat, no-repeat';
});

content.appendChild(titlebar);
content.appendChild(body);
content.appendChild(objective);
content.appendChild(rewards);
content.appendChild(avatar);
root.appendChild(content);


  const closeQuest = () => {
    if (!root) return;
    if (root.__wquestEscDown) document.removeEventListener('keydown', root.__wquestEscDown, true);
    if (root.__wquestEscUp)   document.removeEventListener('keyup',   root.__wquestEscUp,   true);
    root.remove();
    root = null;
  };

  const escTrap = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
      closeQuest();
      return false;
    }
  };
  document.addEventListener('keydown', escTrap, true);
  document.addEventListener('keyup',   escTrap, true);
  root.__wquestEscDown = escTrap;
  root.__wquestEscUp   = escTrap;

  closeBtn.addEventListener('click', closeQuest);

  const builtInClose = root.querySelector('.modal-close,[data-close],.btn-close');
  if (builtInClose && !builtInClose.__wquestBound) {
    builtInClose.__wquestBound = true;
    builtInClose.addEventListener('click', closeQuest);
  }

  return root;
}
*/














	static async castlePlay() {

		let body = DOM({ style: 'castle-play' });

		let play = MM.play();

		play.classList.remove('main-header-item');

		play.classList.remove('button-play');

		play.classList.add('castle-button-play');
		/*
		if(!play.children.length){
			
			play.append(DOM({id:'MMQueue'},'0'));
			
		}
		*/
		let lobby = DOM({ style: 'castle-play-lobby' });

		let data = await App.api.request(CURRENT_MM, 'loadParty'), players = new Array();

		MM.partyId = data.id;

		MM.activeSelectHero = data.users[App.storage.data.id].hero;

		MM.searchActive(data.users[MM.partyId].ready);

		for (let key in data.users) {

			players.push({ id: key, hero: data.users[key].hero, nickname: data.users[key].nickname, ready: data.users[key].ready, rating: data.users[key].rating, skin: data.users[key].skin });

		}
		/*
		if(players.length < 5){
			
			while(players.length < 5){
				
				players.push({id:0,hero:0,nickname:'',ready:0});
				
			}
			
		}
		*/
		for (let p in players) {
			let player = players[p];

			let item = DOM({ style: 'castle-play-lobby-player', data: { id: player.id } });

			const rankIcon = DOM({ style: 'rank-icon' });
			rankIcon.style.backgroundImage = `url(content/ranks/${Rank.icon(player.rating)}.webp)`;

			item.style.backgroundImage = (player.hero) ? `url(content/hero/${player.hero}/${player.skin ? player.skin : 1}.webp)` : '';

			let rank = DOM({ style: 'rank' }, DOM({ style: 'rank-lvl' }, player.rating), rankIcon);

			if (player.rating) {
				item.append(rank);
			}

			let status = DOM({ style: ['castle-party-middle-item-ready-notready', 'castle-party-middle-item-not-ready'] }, DOM({}, 'Не готов'));

			if (player.id) {

				if (player.ready) {

					status.firstChild.innerText = Lang.text('ready');

					status.classList.replace('castle-party-middle-item-not-ready', 'castle-party-middle-item-ready');

				}
				else if (MM.partyId == player.id) {

					status.firstChild.innerText = Lang.text('ready');

					status.classList.replace('castle-party-middle-item-not-ready', 'castle-party-middle-item-ready');


				}
				else if (player.id == App.storage.data.id) {

					status.onclick = async () => {

						if (NativeAPI.status) {
							if (PWGame.gameConnectionTestIsActive) {
								return;
							}

							PWGame.gameConnectionTestIsActive = true;

							try {
								await PWGame.check();

								await PWGame.testGameServerConnection();

								await PWGame.checkUpdates();
							} catch (e) {
								PWGame.gameConnectionTestIsActive = false;
								throw e;
							}

							PWGame.gameConnectionTestIsActive = false;

						}

						await App.api.request(CURRENT_MM, 'readyParty', { id: MM.partyId });

						status.onclick = false;

					}

					status.firstChild.innerText = Lang.text('confirm');

				}

				item.style.backgroundImage = (player.hero) ? `url(content/hero/${player.hero}/${player.skin ? player.skin : 1}.webp)` : `url(content/hero/empty.webp)`;


			}
			else {

				item.innerHTML = '<div class="castle-play-lobby-empty"><div>+</div></div>';

				status.style.opacity = 0;

				// lvl.style.opacity = 0;

				//rank.style.opacity = 0;

			}

			let removeButton = DOM({ style: 'castle-party-remove' });

			removeButton.style.backgroundImage = `url(content/icons/close-cropped.svg)`;

			let nicknameText = DOM({}, `${player.nickname ? player.nickname : 'Добавить'}`);

			let nicknameHideOverflowContainer = DOM({ style: 'castle-party-middle-item-nickname-hidden-overflow' }, nicknameText);

			let nickname = DOM({ style: 'castle-party-middle-item-nickname' }, nicknameHideOverflowContainer);

			let playerX = DOM({ id: `PP${player.id}`, style: 'castle-party-middle-item', title: nickname.innerText }, nickname, item, status);

			if (p > 0 && !players[p - 1].id) {
				playerX.style.display = 'none';
			}

			if (player.nickname.length > 20) {
				nickname.firstChild.firstChild.classList.add('castle-name-autoscroll');
			}

			playerX.dataset.id = player.id;

			nickname.firstChild.firstChild.classList.add('castle-player-nickname');

			if ((MM.partyId == App.storage.data.id) && (playerX.dataset.id != App.storage.data.id) && (playerX.dataset.id != 0)) {
				removeButton.addEventListener('click', async () => {

					await App.api.request(CURRENT_MM, 'leaderKickParty', { id: playerX.dataset.id });

				})

				if (player.nickname.length > 15) {
					nickname.firstChild.firstChild.classList.add('castle-name-autoscroll');
				}

				nickname.append(removeButton);
			}

			if ((MM.partyId != App.storage.data.id) && (playerX.dataset.id == App.storage.data.id)) {
				removeButton.addEventListener('click', async () => {

					await App.api.request(CURRENT_MM, 'leaveParty', { id: MM.partyId });

					View.show('castle');

				})

				if (player.nickname.length > 15) {
					nickname.firstChild.firstChild.classList.add('castle-name-autoscroll');
				}

				nickname.append(removeButton);

			}

			item.addEventListener('click', async () => {

				if (item.dataset.id == App.storage.data.id) {

					if (MM.active) {

						return;

					}

					let request = await App.api.request('build', 'heroAll');

					// request.sort((a, b) => b.rating - a.rating);

					MM.hero = request;

					request.push({ id: 0 });

					let bodyHero = DOM({ style: 'party-hero' });

					let preload = new PreloadImages(bodyHero);

					for (let item2 of request) {

						let hero = DOM();

						hero.addEventListener('click', async () => {

							try {

								await App.api.request(CURRENT_MM, 'heroParty', { id: MM.partyId, hero: item2.id });

							}
							catch (error) {

								return App.error(error);

							}

							item.style.backgroundImage = (item2.id) ? `url(content/hero/${item2.id}/${item2.skin ? item2.skin : 1}.webp)` : `url(content/hero/empty.webp)`;

							MM.activeSelectHero = item2.id;

							Splash.hide();

						});

						if (item2.id) {

							hero.dataset.url = `content/hero/${item2.id}/${item2.skin ? item2.skin : 1}.webp`;

						}
						else {

							hero.dataset.url = `content/hero/empty.webp`;

						}

						preload.add(hero);

					}

					Splash.show(bodyHero, false);

				}
				/*
				if( ( (item.dataset.id == 0) && ( (!MM.partyId ) || (MM.partyId == App.storage.data.id) ) ) ){
					
					let input = DOM({tag:'input',style:'search-input'});
					
					let body = DOM({style:'search-body'});
					
					let search = DOM({style:'search'},input,body,DOM({style:'search-bottom',event:['click',() => {
						
						Splash.hide();
						
					}]},`[Назад]`));
					
					input.addEventListener('input', async () => {
						
						let request = await App.api.request(CURRENT_MM,'findUser',{name:input.value});
						
						if(body.firstChild){
							
							while(body.firstChild){
								
								body.firstChild.remove();
								
							}
							
						}
						
						for(let item of request){
							
							body.append(DOM({event:['click', async () => {
								
								await App.api.request(CURRENT_MM,'inviteParty',{id:item.id});
								
								App.notify(`Приглашение отправлено игроку ${item.nickname}`,1000);
								
								// Splash.hide();
								
							}]},item.nickname));
							
						}
						
					});
					
					Splash.show(search,false);
					
					input.focus();
					
				}
				*/
			})

			lobby.append(playerX);

		}

		body.append(CastleNAVBAR.body, lobby);

		return body;

	}

	static castleBannerOnline() {
  const getDivisionId = () =>
    (window.User && (User.divisionId || User.rank || User.rating)) ||
    (window.Settings && Settings.user && (Settings.user.divisionId || Settings.user.rank)) ||
    10;

	const isFiniteNumber = (v) => Number.isFinite(v) && !Number.isNaN(v);

	const safeQueueCounts = (cssKey) => {
    let party = 0, players = 0;

    try {
		if (typeof View?.getQueue === 'function') {
        const v = Number(View.getQueue(cssKey));
        if (isFiniteNumber(v)) party = v;
    }
    } catch (_) {}

    try {
		if (typeof View?.getTotalQueue === 'function') {
        const t = Number(View.getTotalQueue(cssKey));
        if (isFiniteNumber(t)) players = t;
    }
    } catch (_) {}

    return { players, party };
  };

  // карта режимов
  const modeMap = {
    pvp: 0,
    anderkrug: 1,
    cte: 2,
    m4: 3,
    'custom-battle': 4,
    'pve-ep2-red': 5
  };

  // тип медалей
  const medalMap = {
    pvp: 'gold',
    anderkrug: 'gold',
    cte: 'gold',
    m4: 'gold',
    'pve-ep2-red': 'gold',
    'custom-battle': 'silver'
  };

  const bannerItems = Object.entries(modeMap).map(([cssKey]) => ({
    cssKey,
    label: () => (typeof View?.getQueue === 'function' ? View.getQueue(cssKey) : 0)
  }));

  const banner = DOM({ style: ['castle-banner-online'] });
  banner.append(DOM({ style: ['banner-ornament'] }));

  // --- элементы по режимам ---
  bannerItems.forEach((item, idx) => {
    const wrap = DOM({ style: ['banner-item'] });

    // иконка режима
    const icon = DOM({ style: ['banner-icon', `banner-icon--${item.cssKey}`] });
    wrap.append(icon);

    // счётчик: всегда стартует с "0/0"
    const lbl = DOM({ tag: 'div', style: ['banner-count', 'is-loading'] });
    lbl.textContent = '0/0';
    lbl.title =
      'Отображение очереди по режимам:\n' +
      'слева — игроков в поиске,\n' +
      'справа — количество групп (пати).';
    wrap.append(lbl);


    const onQueuesUpdated = () => {
      const { players, party } = safeQueueCounts(item.cssKey);
      lbl.textContent = `${players}/${party}`;
      if (players || party) lbl.classList.remove('is-loading');
    };
    window.addEventListener?.('queues:updated', onQueuesUpdated);

    let ticks = 0;
    const iv = setInterval(() => {
      ticks++;
      const { players, party } = safeQueueCounts(item.cssKey);
      const current = lbl.textContent;
      const next = `${players}/${party}`;
      if (current !== next) {
        lbl.textContent = next;
      }
      if (players || party) {
        lbl.classList.remove('is-loading');
      }
      if ((players || party) || ticks >= 30) {
        clearInterval(iv);
      }
    }, 500);

    // медаль/кнопка
    const type = medalMap[item.cssKey] || 'gold';
    const disabled = (type === 'silver');

    const medal = DOM({
      tag: 'span',
      style: ['banner-medal', `banner-medal--${type}`, disabled ? 'is-disabled' : null].filter(Boolean)
    });

    if (disabled) {
      medal.title = 'Режим временно недоступен';
    } else {
      medal.title = Lang.text('titlestatisticmode');
      medal.setAttribute('role', 'button');
      medal.tabIndex = 0;
      const openStats = () => { Window.show('main', 'top', 0, idx); };
      medal.addEventListener('click', openStats);
      medal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openStats(); }
      });
    }

    wrap.append(medal);
    banner.append(wrap);

    if (idx < bannerItems.length - 1) {
      banner.append(DOM({ tag: 'div', style: ['banner-separator'] }));
    }
  });

  // --- блок статистики/кнопка Stat ---
  const statWrapper = DOM({ style: ['banner-stat-wrapper'] });
  const statRect    = DOM({ style: ['banner-stat-rect'] });
  const statCircle  = DOM({ style: ['banner-stat-circle'] });

  const statsBtn = DOM({
    style: ['banner-icon', 'banner-icon--stat', 'button-outline'],
    title: Lang.text('titlestatistic'),
    event: ['click', () => {
      const onEsc = (e) => {
        if (e.key === 'Escape') { Splash.hide(); document.removeEventListener('keydown', onEsc); }
      };
      document.addEventListener('keydown', onEsc, { once: true });

      const BASE  = 'https://pw2.26rus-game.ru/stats/';
      const id    = Number(App?.storage?.data?.id) || 0;
      const login = String(App?.storage?.data?.login || '').trim();

      const qs = new URLSearchParams();
      if (id > 0) qs.set('user_id', String(id));
      else if (login) qs.set('login', login);
      else qs.set('user_id', '0');
      qs.set('tab', 'info');
      qs.set('q', '');
      qs.set('_', Date.now().toString());

      const src = `${BASE}?${qs.toString()}`;

      Splash.show(
        DOM(
          { style: 'iframe-stats', event: ['click', (e) => { if (e.target === e.currentTarget) Splash.hide(); }] },
          DOM({ style: 'iframe-stats-navbar', event: ['click', () => Splash.hide()] }),
          DOM({ tag: 'iframe', src, style: 'iframe-stats-frame' })
        ),
        false
      );
    }]
  });

  // бейдж дивизии под кнопкой Stat
  const divId   = getDivisionId();
  const divInfo = typeof Division?.get === 'function' ? Division.get(divId) : { name: 'Дивизион', icon: 1 };

  const divisionBadgeUnderStat = DOM({ style: ['banner-division-badge', 'banner-division-badge--stat'] });
  divisionBadgeUnderStat.style.backgroundImage = `url(content/ranks/${divInfo.icon}.webp)`;
  divisionBadgeUnderStat.title = Lang.text('titlehint2');

  statCircle.append(statsBtn, divisionBadgeUnderStat);
  statWrapper.append(statRect, statCircle);
  
  const questionIcon  = DOM({ tag: 'div', style: ['question-icon'] });

  // подсказка слева
  const tooltipWrap   = DOM({ tag: 'div', style: ['tooltip-wrap-left'] });
  const tooltipBubble = DOM({ tag: 'div', style: ['tooltip-bubble-img'] });
  const tooltipText   = DOM({ tag: 'div', style: ['tooltip-text'] });
  tooltipText.textContent = Lang.text('titlehint');
  tooltipBubble.append(tooltipText);
  tooltipWrap.append(tooltipBubble);

  banner.append(statWrapper);
  return DOM({ style: 'castle-banner-online-wrapper' }, banner);
}


	static castleSettings() {

		let builds = DOM({ style: ['castle-builds', 'button-outline'], title: "Рейтинг", event: ['click', () => View.show('top')] });

		let settings = DOM({
			style: ['castle-settings-btn', 'button-outline'], title: "Вкл/Выкл графики замка", event: ['click', () => {
				let wrapper = DOM({ style: ['castle-settings-window'] })
				settings.append(wrapper);
			}]
		});

		let clan = DOM({ style: ['castle-clans', 'button-outline'], title: 'Кланы', event: ['click', () => Frame.open('clan')] });

		

		let farm = DOM({ style: ['castle-farm', 'button-outline'], title: 'Фарм', event: ['click', () => Window.show('main', 'farm')] });

		
		let input = DOM({ style: 'castle-input', tag: 'input' });

		input.type = 'range';

		input.min = '0';
		input.max = '1';
		input.step = '0.01';

		let body = DOM({ style: ['castle-settings'] });
		let container = DOM({ style: ['castle-settings-container'] }, View.castleBannerOnline(), body);
		return container;
	}

	static castleChat() {

		let body = DOM({ style: 'castle-chat' }, Chat.body);

		return body;

	}

	static castleHeroes() {

		let tab = 1;

		let body = DOM({ style: 'castle-bottom' });

		View.castleBottom = DOM({ style: 'castle-bottom-content' });

		View.castleBottom.addEventListener('wheel', function (event) {

			if (event.deltaY != 0) {

			if (event.deltaMode == event.DOM_DELTA_PIXEL) {

				event.preventDefault();
				
				View.scrollHero(event.deltaY / 100);

			} else if (event.deltaMode == event.DOM_DELTA_LINE) {

				event.preventDefault();
				
				View.scrollHeroLine(event.deltaY / 100);

			} else if (event.deltaMode == event.DOM_DELTA_PAGE) {

				event.preventDefault();

				let modifier = this.clientWidth;

				View.castleBottom.scrollLeft += modifier;

				View.updateArrows();

			}

			}

		});

		View.bodyCastleHeroes();

		let nicknameValue = String(App?.storage?.data?.login || '').trim();
		let nicknameMenuItem = DOM({
			style: 'nickname-menu-item',
			event: ['click', () => {
				App.setNickname();
			}], title: Lang.text('titleNicknameСhange')
			}, DOM({}, nicknameValue));
		if (nicknameValue.length > 10) {
			nicknameMenuItem.firstChild.classList.add('castle-name-autoscroll');
		}
		
		let flagMenuItem = DOM({
			style: 'flag-menu-item',
			event: ['click', () => {
				App.setFraction();
			}], title: Lang.text('titleflag')
			});
		let settingsMenuItem = DOM({
			style: 'settings-menu-item',
			event: ['click', () => {
				Window.show('main', 'menu');
			}], title: Lang.text('titlesettings')
			});
		let chatMenuItem = DOM({
			style: 'chat-menu-item',
			event: ['click', () => {
				Chat.changeChatVisibility();
			}], title: Lang.text('titlechat')
			});
		let heroesMenuItem = DOM({
			style: 'heroes-menu-item',
			event: ['click', () => {

				View.bodyCastleHeroes();
				Castle.buildMode = false;

			}], title: Lang.text('titleheroes')
			});
		let friendsMenuItem = DOM({
			style: 'friends-menu-item',
			event: ['click', () => {

				View.bodyCastleFriends();
				Castle.buildMode = false;

			}], title: Lang.text('titlefriends')
			});
		let buildingsMenuItem = DOM({
			style: 'buildings-menu-item',
			event: ['click', () => {

				View.bodyCastleBuildings();
				Castle.buildMode = true;

			}], title: Lang.text('titleconstruction')
			});

		flagMenuItem.style.backgroundImage = Castle.currentSceneName == 'doct' ? `url(content/icons/Human_logo_over.webp)` : `url(content/icons/Elf_logo_over.webp)`; 
		
		View.arrows = new Object();
		View.arrows.ls = DOM({style: 'castle-bottom-left-scroll-single', event: ['click', () => View.scrollHero(-1)]});
		View.arrows.ld = DOM({style: 'castle-bottom-left-scroll-double', event: ['click', () => View.scrollHeroLine(-1)]});
		View.arrows.rs = DOM({style: 'castle-bottom-right-scroll-single', event: ['click', () => View.scrollHero(1)]});
		View.arrows.rd = DOM({style: 'castle-bottom-right-scroll-double', event: ['click', () => View.scrollHeroLine(1)]});
		body.append(DOM({ style: 'castle-bottom-menu' }, nicknameMenuItem, flagMenuItem, settingsMenuItem, heroesMenuItem , friendsMenuItem, buildingsMenuItem, chatMenuItem), 
		DOM({style: 'castle-bottom-content-container'}, 
			View.castleBottom,
			DOM({ style: 'castle-bottom-content-left-scroll' }, 
				View.arrows.ls,
				View.arrows.ld,
			),
			DOM({ style: 'castle-bottom-content-right-scroll' }, 
				View.arrows.rs,
				View.arrows.rd,
			)
			));

		View.updateArrows();

		return body;
	}

	static currentFloatScroll = 0.0;

	static scrollHero(delta) {

		let modifier = parseFloat(getComputedStyle(View.castleBottom.firstChild).width) + parseFloat(getComputedStyle(View.castleBottom.firstChild).borderRightWidth);

		let maxScrollLeft = View.castleBottom.scrollWidth - View.castleBottom.clientWidth;
		if (isNaN(View.currentFloatScroll)) {
			View.currentFloatScroll = 0;
		}
		View.currentFloatScroll += modifier * delta;
		View.currentFloatScroll = Castle.clamp(View.currentFloatScroll, 0, maxScrollLeft);
		View.castleBottom.scrollLeft = View.currentFloatScroll;

		View.updateArrows();

	}

	static scrollHeroLine(delta) {

		let width = parseFloat(getComputedStyle(View.castleBottom).width);

		let maxScrollLeft = View.castleBottom.scrollWidth - View.castleBottom.clientWidth;
		if (isNaN(View.currentFloatScroll)) {
			View.currentFloatScroll = 0;
		}
		View.currentFloatScroll += width * delta;
		View.currentFloatScroll = Castle.clamp(View.currentFloatScroll, 0, maxScrollLeft);
		View.castleBottom.scrollLeft = View.currentFloatScroll;

		View.updateArrows();
		
	}

	static updateArrows() {
		let maxScrollLeft = View.castleBottom.scrollWidth - View.castleBottom.clientWidth;
		if (View.castleBottom.scrollLeft == 0) {
			View.arrows.ls.classList.add('castle-bottom-content-btn-disable');
			View.arrows.ld.classList.add('castle-bottom-content-btn-disable');
		} else {
			View.arrows.ls.classList.remove('castle-bottom-content-btn-disable');
			View.arrows.ld.classList.remove('castle-bottom-content-btn-disable');
		}

		if (maxScrollLeft && View.castleBottom.scrollLeft == maxScrollLeft) {
			View.arrows.rs.classList.add('castle-bottom-content-btn-disable');
			View.arrows.rd.classList.add('castle-bottom-content-btn-disable');
		} else {
			View.arrows.rs.classList.remove('castle-bottom-content-btn-disable');
			View.arrows.rd.classList.remove('castle-bottom-content-btn-disable');
		}
	}
	/*
	static async castleQuest(){

  let body = DOM({ style:'quest' });

  const list   = DOM({ style:'quest-list' });
  const PAGE   = 4;
  let   start  = 0;
  const items  = [];

  const btnUp = DOM({
    style: ['quest-arrow','quest-arrow-up'],
    event: ['click', () => { if (start > 0) { start--; render(); } }]
  });

  const btnDown = DOM({
    style: ['quest-arrow','quest-arrow-down'],
    event: ['click', () => {
      if (start < Math.max(0, items.length - PAGE)) { start++; render(); }
    }]
  });

  body.append(btnUp, list, btnDown); // порядок: ▲ список ▼

  let request = [
    {
      id:1,
      heroId:16,
      title:'Смена власти',
      description:'Ты силён. Я видел твои победы. Но сила без амбиций — лишь пустой звук. Один герой, возомнил себя наследником трона. Убери его. Докажи, что настоящая сила — в умении вовремя нанести удар.',
      target:'Получить сведения в тамбуре, идентифицировать героя и устранить жертву на поле боя в пограничье не меньше трёх раз за один бой. Ваш герой не должен умереть от жертвы.',
      reward:'+ N количество кристаллов прайма, где N — уровень винрейта жертвы.',
      prompt:'Получить сведения в тамбуре, могут только герои класса — Убийца.',
      status:0,
      timer:(Date.now() + 86400000)
    },
    {
      id:2,
      heroId:1,
      title:'Право сильнейшего',
      description:'Пограничье видело немало поединков, но истинных воинов среди них — единицы. Один из героев запятнал свою честь, используя запрещённые приёмы в бою. Он должен быть остановлен твоим мастерством. Сразись с ним и докажи, что сила без чести — ничто. Победи его в честном дуэли, и твоя награда будет достойной.',
      target:'Получить сведения в тамбуре, идентифицировать героя и устранить жертву на поле боя в пограничье за один бой. Ваш герой не должен умереть до того, как устранит жертву.',
      reward:'+ N количество кристаллов прайма, где N — уровень винрейта жертвы.',
      prompt:'Получить сведения в тамбуре, могут только герои класса — Убийца.',
      status:0,
      timer:(Date.now() + 86400000)
    },
    {
      id:3,
      heroId:38,
      title:'Воздаяние Неуязвимому',
      description:'Мой взор пронзает битвы и интриги этого мира, и я видела, как твоя сила обратила в бегство тех, кто возжелал твоей погибели. Они думали, что ты — добыча. Они ошиблись. Ты — испытание, которое они не смогли пройти. Их неудача — доказательство твоей избранности. И за это достоинство ты должен быть вознаграждён. Прими мой дар — не как плату за убийство, но как признание твоей несокрушимости',
      target:'Выжить в условиях PvP-охоты',
      reward:'+1 кристалл прайма',
      prompt:'',
      status:0,
      timer:(Date.now() + 86400000)
    },
    {
      id:4,
      heroId:13,
      title:'Сила единства',
      description:'Приветствую тебя, дитя Света! Этот мир держится не только на силе клинка, но и на взаимопомощи. Я вижу, как ты сражаешься, но истинная мощь проявляется, когда мы поддерживаем друг друга. Твои союзники нуждаются в твоей помощи — исцелении, защите, усилении. Окажи 1000 поддержек в битвах, и я покажу тебе, какую силу рождает настоящее единство.',
      target:'Оказать 1000 поддержек союзным героям.',
      reward:'+100 кристаллов прайма',
      prompt:'',
      status:0,
      timer:(Date.now() + (86400000 * 30))
    },
    {
      id:5,
      heroId:3,
      title:'Путь Превосходства',
      description:'Приветствую, испытующий! Мир Прайма рожден из хаоса и крови. Сила — единственный язык, который здесь понимают все. Ты уже показал себя в битвах, но настоящая мощь требует жертв. Я бросаю тебе вызов: соверши 1000 убийств. Пусть каждый поверженный враг станет твоим шагом к величию. Докажи, что ты достоин называться истинным чемпионом Прая!',
      target:'Совершить 1000 убийств вражеских героев.',
      reward:'+100 кристаллов прайма',
      prompt:'',
      status:0,
      timer:(Date.now() + (86400000 * 30))
    }
  ];

  for (let item of request) {

    let hero = DOM({ style:'quest-item-hero' }, DOM({ style:'quest-item-portrait-glass' }));
    hero.style.backgroundImage = `url(content/hero/${item.heroId}/1.webp)`;

    let timer = DOM({ style:'quest-item-timer' });
    const tick = () => {
      const ms  = item.timer - Date.now();
      const sec = Math.max(0, Math.floor(ms / 1000));
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      timer.textContent = h > 0
        ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
        : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    };
    tick();
    setInterval(tick, 1000);

    let quest = DOM(
      {
        style:'quest-item',
        event:['click', () => {
          // Удаляем возможные предыдущие окна и не передаём превью-ноду
          document.querySelectorAll('#wquest').forEach(n => n.remove());
          Window.show('main','quest', item.id, null, item);
        }]
      },
      DOM({ style:'quest-item-portrait-background' }, hero, DOM({ style:'quest-item-exclamation' })),
      timer
    );

    items.push(quest);
    if (items.length <= PAGE) list.append(quest);
  }

  function render() {
    list.innerHTML = '';
    const end = Math.min(start + PAGE, items.length);
    for (let i = start; i < end; i++) list.append(items[i]);
    const maxStart = Math.max(0, items.length - PAGE);
    const noScroll = items.length <= PAGE;
    btnUp.classList.toggle('disabled', noScroll || start === 0);
    btnDown.classList.toggle('disabled', noScroll || start >= maxStart);
  }

  render();
  return body;
}
*/

	static bodyCastleBuildings() {

		while (View.castleBottom.firstChild) {

			View.castleBottom.firstChild.remove();

		}


		let selectedFaction = -1;
		if (Castle.currentSceneName == 'ad') {
			selectedFaction = 0;
		}
		if (Castle.currentSceneName == 'doct') {
			selectedFaction = 1;
		}
		if (selectedFaction == -1) {
			return;
		}

		let preload = new PreloadImages(View.castleBottom);

		for (let i = 1; i < Castle.buildings.length; ++i) {
			let item = Castle.buildings[i];
			let itemName = Lang.text(Castle.buildingsNames[i][selectedFaction]);
			
			let buildingName = DOM({ style: 'castle-hero-name' }, DOM({}, itemName));

			if (itemName.length > 10) {
				buildingName.firstChild.classList.add('castle-name-autoscroll');
			}

			let buildingNameBase = DOM({ style: 'castle-item-hero-name' }, buildingName);

			let building = DOM({ style: 'castle-building-item' }, buildingNameBase);

			building.dataset.url = `content/img/buildings/${Castle.currentSceneName}/${item}.png`;

			building.dataset.buildingId = i;

			building.addEventListener('click', async () => {
				Castle.phantomBuilding.id = building.dataset.buildingId;
			});

			preload.add(building);

		}

	}

	static bodyCastleHeroes() {
		let preload = new PreloadImages(View.castleBottom);

		App.api.silent((result) => {
			MM.hero = result;

			while (View.castleBottom.firstChild) {
				View.castleBottom.firstChild.remove();
			}

			for (let item of result) {
				// Используем новый метод для получения имени с учётом скина
				const localizedName = Lang.heroName(item.id, item.skin);
				const heroName = DOM({ style: 'castle-hero-name' }, DOM({}, localizedName));

				if (localizedName.length > 10) {
					heroName.firstChild.classList.add('castle-name-autoscroll');
				}

				let heroNameBase = DOM({ style: ['castle-item-hero-name', 'hover-brightness'] }, heroName);

				let rankIcon = DOM({ style: 'castle-hero-rank-icon' });
				rankIcon.style.backgroundImage = `url(content/ranks/${Rank.icon(item.rating)}.webp)`;

				let rank = DOM({ style: 'castle-hero-rank' }, DOM({ style: 'castle-hero-rank-lvl' }, item.rating), rankIcon);

				let hero = DOM({ id: `id${item.id}`, style: ['castle-hero-item', 'hover-brightness'] }, 
					DOM({ style: ['castle-hero-item-bg', 'hover-brightness']}), 
					DOM({ style: ['castle-hero-item-img', 'no-hover-brightness']}), 
					DOM({ style: ['castle-item-background', 'hover-brightness']}), 
					DOM({ style: ['castle-item-ornament', 'hover-brightness']}), 
					rank, 
					heroNameBase);

				hero.addEventListener('click', async () => Window.show('main', 'build', item.id, 0, true));

				hero.dataset.url = `content/hero/${item.id}/${item.skin ? item.skin : 1}.webp`;

				preload.add(hero);
			}
		}, 'build', 'heroAll');
	}

	static bodyCastleFriends() {

		let preload = new PreloadImages(View.castleBottom);

		App.api.silent((result) => {

			while (View.castleBottom.firstChild) {

				View.castleBottom.firstChild.remove();

			}
			// status 1 - друг, 2 - запрос дружбы, 3 - дружбу отправил, игрок еще не подтвердил
			console.log('ДРУЗЬЯ', result);

			let buttonAdd = DOM({
			style: 'castle-friend-item',
			onclick: () => {
				let input = DOM({ tag: 'input', style: 'search-input', placeholder: 'Ник игрока' });
				let body = DOM({ style: 'search-body' });

				// Создаём крестик для закрытия (как в buildSelectName)
				let closeButton = DOM({
					tag: 'div',
					style: 'close-button',
					event: ['click', () => Splash.hide()]
				});
				closeButton.style.backgroundImage = 'url(content/icons/close-cropped.svg)';

				let search = DOM({ style: 'search' }, input, body, closeButton);

				input.addEventListener('input', async () => {
					let request = await App.api.request('user', 'find', { nickname: input.value });

					if (body.firstChild) {
						while (body.firstChild) {
							body.firstChild.remove();
						}
					}

						for (let item of request) {

							let template = DOM({
								event: ['click', async () => {

									await App.api.request('friend', 'request', { id: item.id });

									View.bodyCastleFriends();

									App.notify(`Заявка в друзья ${item.nickname} отправлена`, 1000);

									Splash.hide();

								}]
							}, item.nickname);

							if ('blocked' in item) {

								template.oncontextmenu = () => {
								let body = document.createDocumentFragment();
								
								// Создаём крестик для закрытия
								const closeButton = DOM({
									tag: 'div',
									style: 'close-button',
									event: ['click', () => Splash.hide()]
								});
								closeButton.style.backgroundImage = 'url(content/icons/close-cropped.svg)';

								body.append(
									DOM({}, item.nickname),
									DOM({
										style: 'splash-content-button',
										event: ['click', async () => {
											await App.api.request('user', 'blocked', { id: item.id });
											Splash.hide();
										}]
									}, (item.blocked ? 'Разблокировать' : 'Заблокировать')),
									DOM({
										style: 'splash-content-button',
										event: ['click', async () => {
											await App.api.request('user', 'mute', { id: item.id });
											Splash.hide();
										}]
									}, (item.mute ? 'Убрать мут' : 'Мут чата')),
									DOM({
										style: 'splash-content-button',
										event: ['click', async () => {
											let password = await App.api.request('user', 'restore', { id: item.id });
											App.notify(`Скопировано в буфер обмена! Пароль: ${password}`);
											navigator.clipboard.writeText(password);
										}]
									}, 'Сброс пароля'),
									closeButton // Добавляем крестик вместо кнопки "Назад"
								);

								Splash.show(body);
								return false;
							}

								if (item.mute) {

									template.style.color = 'yellow';

								}

								if (item.blocked) {

									template.style.color = 'red';

								}

							}

							body.append(template);

						}

					});

					Splash.show(search, false);

					input.focus();

				}
			}, DOM({ style: 'castle-friend-item-middle' }, DOM({ style: 'castle-friend-add' }, '+')));

			preload.add(buttonAdd);

			buttonAdd.dataset.url = `content/hero/empty.webp`;

			for (let item of result) {

				const heroName = DOM({ style: 'castle-hero-name' }, DOM({tag:'span'}, item.nickname));
				heroName.prepend(DOM({tag:'span',event:['click', async () => {
					
					try{
						
						let voice = new Voice(item.id,'friend',item.nickname,true);
						
						await voice.call();
						
					}
					catch(error){
						
						App.error(error);
						
					}
					
				}]},'☎️ '));
				if (item.nickname.length > 10) {
					heroName.firstChild.classList.add('castle-name-autoscroll');
				}

				let heroNameBase = DOM({ style: 'castle-item-hero-name' }, heroName);
				
				let bottom = DOM({ style: 'castle-friend-item-bottom' });

				let friend = DOM({ style: 'castle-friend-item' }, heroNameBase, bottom);

				if (item.status == 1) {

					let group = DOM({ style: 'castle-friend-add-group' }, (item.online) ? 'Группа' : 'Не в сети');

					if (!item.online) {

						group.style.filter = 'grayscale(1)';

					}
					else {

						group.onclick = async () => {

							await App.api.request(CURRENT_MM, 'inviteParty', { id: item.id });

							App.notify(`Приглашение отправлено игроку ${item.nickname}`);

						}

					}

					friend.oncontextmenu = () => {

						let body = document.createDocumentFragment();

						let b1 = DOM({
							style: 'splash-content-button', event: ['click', async () => {

								await App.api.request('friend', 'remove', { id: item.id });

								friend.remove();

								Splash.hide();

							}]
						}, 'Удалить');

						let b2 = DOM({ style: 'splash-content-button', event: ['click', () => Splash.hide()] }, 'Отмена');

						body.append(DOM(`Удалить ${item.nickname} из друзей?`), b1, b2);

						Splash.show(body);

						return false;

					}

					bottom.append(group);

				}
				else if (item.status == 2) {

					bottom.append(DOM({
						style: 'castle-friend-confirm', event: ['click', async () => {

							await App.api.request('friend', 'accept', { id: item.id });

							while (bottom.firstChild) {

								bottom.firstChild.remove();

							}

							bottom.append(DOM({
								style: 'castle-friend-add-group', event: ['click', async () => {

									await App.api.request(CURRENT_MM, 'inviteParty', { id: item.id });

									App.notify(`Приглашение отправлено игроку ${item.nickname}`);

								}]
							}, 'Группа'));

						}]
					}, 'Принять'), DOM({
						style: 'castle-friend-cancel', event: ['click', async () => {

							await App.api.request('friend', 'remove', { id: item.id });

							friend.remove();

						}]
					}, 'Отклонить'));

				}
				else if (item.status == 3) {

					friend.append(DOM({ style: 'castle-friend-item-middle' }, DOM({ style: 'castle-friend-request' }, 'Ожидание')));

					friend.style.filter = 'grayscale(1)';

					bottom.append(DOM({
						style: 'castle-friend-cancel', event: ['click', async () => {

							await App.api.request('friend', 'remove', { id: item.id });

							friend.remove();

						}]
					}, Lang.text('cancel')));

				}

				friend.dataset.url = `content/hero/empty.webp`;

				preload.add(friend);
				
			}

		}, 'friend', 'list');

	}

	static exitOrLogout() {
		let logout = DOM({
			event: ['click', async () => {

				App.exit();

				Splash.hide();

			}]
		}, 'Выйти из аккаунта');

		let close = DOM({ event: ['click', () => Splash.hide()] }, 'Отмена');

		let wrap = DOM({ style: 'wrap' }, logout, close);

		if (NativeAPI.status) {

			let exit = DOM({ event: ['click', () => NativeAPI.exit()] }, Lang.text('exit'));

			wrap = DOM({ style: 'wrap' }, logout, exit, close);

		}

		let dom = DOM({ style: 'div' }, '', wrap);

		Splash.show(dom);
	}

	static header() {

		let play = MM.play();

		play.classList.add('main-header-item');

		play.classList.add('button-play');

		play.classList.remove('castle-button-play');

		let playButton = DOM({ style: 'menu-button-play' }, play)

		let menu = DOM({ style: 'main-header' }, DOM({ tag: 'img', src: 'content/img/logo.webp', event: ['click', () => View.show('castle')] }), playButton);

		if (App.isAdmin()) {

			let adm = DOM({
				style: 'main-header-item', event: ['click', () => {

					let body = document.createDocumentFragment();

					body.append(DOM({
						style: 'splash-content-button', event: ['click', () => {

							View.show('talents');

							Splash.hide();

						}]
					}, 'Таланты (обычные)'), DOM({
						style: 'splash-content-button', event: ['click', () => {

							View.show('talents2');

							Splash.hide();

						}]
					}, 'Таланты (классовые)'), DOM({
						style: 'splash-content-button', event: ['click', () => {

							View.show('users');

							Splash.hide();

						}]
					}, 'Пользователи'), DOM({ style: 'splash-content-button', event: ['click', () => Splash.hide()] }, '[X]'));

					Splash.show(body);

				}]
			}, 'Админ');

			adm.classList.add('animation1');

			adm.style.color = 'rgba(255,255,255,1)';

			menu.append(adm);

		}

		menu.append(
			DOM({ style: 'main-header-item', event: ['click', () => View.show('castle')] }, Castle.gl ? 'Замок' : 'Лобби'),
			DOM({ style: 'main-header-item', event: ['click', () => View.show('builds')] }, 'Билды'),
			/*DOM({ style: 'main-header-item', event: ['click', () => View.show('history')] }, 'История'),*/
			DOM({ style: 'main-header-item', event: ['click', () => View.show('top')] }, 'Рейтинг'),
			DOM({ style: 'main-header-item', event: ['click', () => View.show('game')] }, 'Фарм'),
			DOM({ style: 'main-header-item', event: ['click', () => View.exitOrLogout()] }, 'Выйти')
		);

		return menu;

	}

	static async main(data) {

		let body = DOM({ style: 'main' });

		let middle = DOM({ style: 'party-middle' });

		// const chatInput = DOM({tag: 'input', placeholder: 'Enter your message here', style: 'chat-input'});
		// const chatMessages = DOM({style: 'chat-input'});
		// const chat = DOM({style: 'chat'}, chatMessages, chatInput);

		// let party = DOM({style:'party'},middle, chat);

		let top = DOM({ style: 'top' });

		App.api.silent((result) => {

			let number = 1;

			for (let player of result) {

				let rank = DOM({ style: 'top-item-hero-rank' });

				rank.style.backgroundImage = `url(content/ranks/${Rank.icon(player.rating)}.webp)`;

				let hero = DOM({ style: 'top-item-hero' }, rank);

				hero.style.backgroundImage = `url(content/hero/${player.hero}/${player.skin ? player.skin : 1}.webp)`;

				let item = DOM({ style: 'top-item', event: ['click', () => Build.view(player.id, player.hero, player.nickname)] }, hero, DOM({ style: 'top-item-player' }, DOM(`#${number}. ${player.nickname}`), DOM(`${player.rating}`)));

				if (number == 1) {

					//item.style.background = 'rgba(255,50,0,0.9)';

					item.classList.add('animation1');

				}
				/*
				else if(number == 2){
					
					item.style.background = 'rgba(255,100,0,0.9)';
					
				}
				else if(number == 3){
					
					item.style.background = 'rgba(150,50,255,0.9)';
					
				}
				else if(number == 4){
					
					item.style.background = 'rgba(50,100,200,0.9)';
					
				}
				*/
				top.append(item);

				number++;

			}

		}, CURRENT_MM, 'top');

		let party = DOM({ style: 'party' }, middle);

		let players = new Array();

		data = (data) ? data : await App.api.request(CURRENT_MM, 'loadParty');

		MM.partyId = data.id;

		MM.activeSelectHero = data.users[App.storage.data.id].hero;

		MM.searchActive(data.users[MM.partyId].ready);

		for (let key in data.users) {

			players.push({ id: key, hero: data.users[key].hero, nickname: data.users[key].nickname, ready: data.users[key].ready, rating: data.users[key].rating, skin: data.users[key].skin });

		}

		if (players.length < 5) {

			while (players.length < 5) {

				players.push({ id: 0, hero: 0, nickname: '', ready: 0 });

			}

		}

		for (let item of players) {

			let img = DOM({ style: 'party-middle-item-middle' });

			let rankIcon = DOM({ style: 'rank-icon' });

			rankIcon.style.backgroundImage = `url(content/ranks/${Rank.icon(item.rating)}.webp)`;

			let rank = DOM({ style: 'rank' }, DOM({ style: 'rank-lvl' }, item.rating), rankIcon);

			img.append(rank);

			let status = DOM({ style: 'party-middle-item-not-ready' }, DOM({}, 'Не готов'));

			if (item.id) {

				if (item.ready) {

					status.firstChild.innerText = Lang.text('ready');

					status.classList.replace('party-middle-item-not-ready', 'party-middle-item-ready');

				}
				else if (MM.partyId == item.id) {

					status.firstChild.innerText = Lang.text('ready');

					status.classList.replace('party-middle-item-not-ready', 'party-middle-item-ready');


				}
				else if (item.id == App.storage.data.id) {

					status.onclick = async () => {

						if (NativeAPI.status) {
							if (PWGame.gameConnectionTestIsActive) {
								return;
							}

							PWGame.gameConnectionTestIsActive = true;

							try {
								await PWGame.check();

								await PWGame.testGameServerConnection();

								await PWGame.checkUpdates();
							} catch (e) {
								PWGame.gameConnectionTestIsActive = false;
								throw e;
							}

							PWGame.gameConnectionTestIsActive = false;

						}
						else {

							return;

						}

						await App.api.request(CURRENT_MM, 'readyParty', { id: MM.partyId });

						status.onclick = false;

					}

					status.innerText = 'Подтвердить';

				}

				img.style.backgroundImage = (item.hero) ? `url(content/hero/${item.hero}/${item.skin ? item.skin : 1}.webp)` : `url(content/hero/empty.webp)`;

			}
			else {

				img.innerText = '+';

				status.style.opacity = 0;

				// lvl.style.opacity = 0;

				//rank.style.opacity = 0;

			}

			let nickname = DOM({ style: 'party-middle-item-nickname' }, `${item.nickname ? item.nickname : 'Добавить'}`);

			let player = DOM({ id: `PP${item.id}`, style: 'party-middle-item' }, nickname, img, status); // TODO use this for lvl and rank
			// let player = DOM({id:`PP${item.id}`,style:'party-middle-item'},nickname,img,status);

			player.dataset.id = item.id;

			if ((MM.partyId == App.storage.data.id) && (player.dataset.id != App.storage.data.id) && (player.dataset.id != 0)) {

				nickname.append(DOM({
					tag: 'span', event: ['click', async () => {

						await App.api.request(CURRENT_MM, 'leaderKickParty', { id: player.dataset.id });

					}]
				}, '[X]'));

			}

			if ((MM.partyId != App.storage.data.id) && (player.dataset.id == App.storage.data.id)) {

				nickname.append(DOM({
					tag: 'span', event: ['click', async () => {

						await App.api.request(CURRENT_MM, 'leaveParty', { id: MM.partyId });

						View.show('castle');

					}]
				}, '[X]'));

			}

			img.addEventListener('click', async () => {

				if (player.dataset.id == App.storage.data.id) {

					if (MM.active) {

						return;

					}

					let request = await App.api.request('build', 'heroAll');

					MM.hero = request;

					request.push({ id: 0 });

					let bodyHero = DOM({ style: 'party-hero' });

					let preload = new PreloadImages(bodyHero);

					for (let item of request) {

						let hero = DOM();

						hero.addEventListener('click', async () => {

							try {

								await App.api.request(CURRENT_MM, 'heroParty', { id: MM.partyId, hero: item.id });

							}
							catch (error) {

								return App.error(error);

							}

							MM.activeSelectHero = item.id;

							Splash.hide();

						});

						if (item.id) {

							hero.dataset.url = `content/hero/${item.id}/${item.skin ? item.skin : 1}.webp`;

						}
						else {

							hero.dataset.url = `content/hero/empty.webp`;

						}

						preload.add(hero);

					}

					Splash.show(bodyHero, false);

				}

				if (((player.dataset.id == 0) && ((!MM.partyId) || (MM.partyId == App.storage.data.id)))) {

					let input = DOM({ tag: 'input', style: 'search-input' });

					let body = DOM({ style: 'search-body' });

					let search = DOM({ style: 'search' }, input, body, DOM({
						style: 'search-bottom', event: ['click', () => {

							Splash.hide();

						}]
					}, Lang.text('back')));

					input.addEventListener('input', async () => {

						let request = await App.api.request(CURRENT_MM, 'findUser', { name: input.value });

						if (body.firstChild) {

							while (body.firstChild) {

								body.firstChild.remove();

							}

						}

						for (let item of request) {

							body.append(DOM({
								event: ['click', async () => {

									await App.api.request(CURRENT_MM, 'inviteParty', { id: item.id });

									App.notify(`Приглашение отправлено игроку ${item.nickname}`, 1000);

									// Splash.hide();

								}]
							}, item.nickname));

						}

					});

					Splash.show(search, false);

					input.focus();

				}

			})

			middle.append(player);

		}

		body.append(View.header(), DOM({ style: 'main-body-column' }, top, party));

		return body;

	}
	/*
	static async history(isWindow) {

		let body = DOM({ style: 'main' }), history = DOM({ style: isWindow ? 'whistory' : 'history' });

		let result = await App.api.request(CURRENT_MM, 'history');

		for (let item of result) {

			let hero = DOM();

			hero.style.backgroundImage = `url(content/hero/${item.hero}/${item.skin ? item.skin : 1}.webp)`;

			let game = DOM({ style: 'history-item' }, hero, DOM({ style: 'history-text-box', tag: 'div' }, (item.team == 1) ? 'Докты' : 'Адорния'), DOM({ style: 'history-text-box', tag: 'div' }, Math.round(((item.team == item.win) ? +item.rating : -item.rating) * 10.0) / 10.0), DOM({ style: 'history-text-box', tag: 'div' }, new Date(item.added).toLocaleString()));

			if (item.team == item.win) {

				game.style.background = 'rgba(51,255,51,0.5)';

			}

			history.append(game);

		}

		if (!isWindow) {
			body.append(View.header());
		}
		body.append(history);

		return body;

	}
	*/
	static async top(hero = 0, isSplah = false, mode = 0) {
		
		let body = DOM({ style: 'main' });

		let result = await App.api.request(CURRENT_MM, 'top', { limit: 100, hero: hero, mode: mode });

		if (!result) {

			throw 'Рейтинг отсутствует';

		}

		let top = DOM({ style: isSplah ? 'wtop-scroll' : 'top-scroll' },
			DOM({
				style: 'top-filter', title: 'Выберите героя, чтобы отсортировать игроков зала славы', event: ['click', async () => {

					let request = await App.api.request('build', 'heroAll');

					request.push({ id: 0 });

					let bodyHero = DOM({ style: 'party-hero' });

					let preload = new PreloadImages(bodyHero);

					for (let item of request) {

						let hero = DOM();

						if (item.id) {

							hero.dataset.url = `content/hero/${item.id}/${item.skin ? item.skin : 1}.webp`;

						}
						else {

							hero.dataset.url = `content/hero/empty.webp`;

						}

						hero.addEventListener('click', async () => {

							if (isSplah) {
								Window.show('main', 'top', item.id, mode);
							} else {
								View.show('top', item.id, false, mode);
							}

							Splash.hide();

						});

						preload.add(hero);

					}

					Splash.show(bodyHero, false);

				}]
			}, DOM({ tag: 'div' }), DOM({ tag: 'div' })));

		top.firstChild.classList.add('animation1');

		top.firstChild.firstChild.style.backgroundImage = `url(content/hero/${result[0].hero}/${result[0].skin ? result[0].skin : 1}.webp)`;

		top.firstChild.lastChild.innerText = `#1. ${result[0].nickname}`;

		let number = 1;

		for (let player of result) {

			let rank = DOM({ style: 'top-item-hero-rank' });

			rank.style.backgroundImage = `url(content/ranks/${Rank.icon(player.rating)}.webp)`;

			let hero = DOM({ style: 'top-item-hero' }, rank);

			hero.style.backgroundImage = `url(content/hero/${player.hero}/${player.skin ? player.skin : 1}.webp)`;

			let item = DOM({ style: 'top-item', event: ['click', () => Build.view(player.id, player.hero, player.nickname)] }, hero, DOM({ style: 'top-item-player' }, DOM(`#${number}. ${player.nickname}`), DOM(`${player.rating}`)));

			top.append(item);

			number++;

		}

		if (!isSplah) {
			body.append(View.header());
		}
		body.append(top);

		return body;

	}

	static builds() {

		let body = DOM({ style: 'main' });

		let hero = DOM({ style: 'hero' });

		let preload = new PreloadImages(hero, (element) => {
			/*
			let test = () => {
				
				element.dataset.slide = ( ( ( Number(element.dataset.slide) + 1 ) > element.dataset.total ) ? 1 : ( Number(element.dataset.slide) + 1 ));
				
				PreloadImages.load(() => {
					
					let firstSlide = DOM(), twoSlide = DOM();
					
					firstSlide.style.backgroundImage = element.style.backgroundImage;
					
					element.append(firstSlide);
					
					element.style.backgroundImage = 'none';
					
					twoSlide.style.opacity = 0;
					
					element.append(twoSlide);
					
					twoSlide.style.backgroundImage = `url("content/hero/${element.dataset.id}/${element.dataset.slide}.webp")`;
					
					firstSlide.animate({opacity:[1,0]},{duration:500,easing:'ease-out',fill:'forwards'});
					
					let animation = twoSlide.animate({opacity:[0,1]},{duration:500,easing:'ease-in',fill:'forwards'});
					
					animation.onfinish = () => {
						
						element.style.backgroundImage = twoSlide.style.backgroundImage;
						
						firstSlide.remove();
						
						twoSlide.remove();
						
						setTimeout(() => {
							
							test();
							
						},App.getRandomInt(5000,15000));
						
					}
					
				},`content/hero/${element.dataset.id}/${element.dataset.slide}.webp`);
				
			}
			
			if(element.dataset.total > 1){
				
				setTimeout(() => {
					
					test();
					
				},App.getRandomInt(2500,5000));
				
			}
			*/
		});

		App.api.silent((result) => {

			MM.hero = result;

			for (const item of result) {
				//item.rating = App.getRandomInt(1100,3000);
				let rankIcon = DOM({ style: 'rank-icon' });

				rankIcon.style.backgroundImage = `url(content/ranks/${Rank.icon(item.rating)}.webp)`;

				let rank = DOM({ style: 'rank' }, DOM({ style: 'rank-lvl' }, item.rating), rankIcon);

				const hero = DOM({ style: 'hero-item' }, DOM({ tag: 'span', style: 'name' }, item.name), rank);

				hero.addEventListener('click', () => View.show('build', item.id));

				hero.dataset.id = item.id;

				hero.dataset.slide = 1;

				hero.dataset.total = item.total;

				hero.dataset.url = `content/hero/${item.id}/${item.skin ? item.skin : 1}.webp`;

				preload.add(hero);

			}

		}, 'build', 'heroAll');

		body.append(View.header(), DOM({ style: 'main-body-full' }, hero));

		return body;

	}

	static inventory(isWindow) {

		let body = DOM({ style: 'main' });

		let inventory = DOM({ style: 'inventory' });

		App.api.silent((result) => {

			for (let item of result) {

				let unit = DOM({ style: [`rarity${item.rarity}`] });

				unit.style.backgroundImage = `url(content/talents/${item.id}.webp)`;

				unit.append(DOM({ tag: 'span' }, item.score));

				inventory.append(unit);

			}

		}, 'gamev2', 'inventory');


		if (!isWindow) {
			body.append(DOM({ style: 'main-header' },
				DOM({ tag: 'img', src: 'content/img/logo.webp' }),
				DOM({ style: 'main-header-item', event: ['click', () => View.show('castle')] }, App.storage.data.login),
				DOM({ style: 'main-header-item', event: ['click', () => View.show('inventory')] }, 'Осколки'),
				DOM({ style: 'main-header-item', event: ['click', () => View.show('game')] }, 'Фарм'),
				DOM({ style: 'main-header-item', event: ['click', () => View.exitOrLogout()] }, 'Выйти')
			))
		} else {
			body.append(DOM({ style: 'inventory-header' }, Lang.text('library')))
		}
		body.append(
			DOM({ style: 'main-body-full' }, inventory)
		);

		return body;

	}

	static game(isWindow) {

		let body = DOM({ style: 'game' });

		let button = DOM({
			style: 'game-button', event: ['click', async () => {

				let request = await App.api.request('gamev2', 'start');

				if ('error' in request) {

					button.innerText = `Начать фарм можно будет через ${request.error} мин.`;

					return;

				}

				dscription.remove();

				request.back = () => {

					View.show('castle');

				}

				request.finish = async () => {

					await App.api.request('gamev2', 'finish');

					isWindow ? Window.close('main') : View.show('castle');

				}

				request.exit = () => {

					View.show('castle');

				}

				Game.init(body, request, isWindow);

			}]
		}, 'Начать фарм');

		let dscription = DOM({ style: 'game-description' },
			DOM({ tag: 'h1' }, 'Лорды и леди!'),
			DOM({ tag: 'p' }, '— необходимо собрать 1000 осколков одного и того же таланта, чтобы получить 1 талант для билда;'),
			DOM({ tag: 'p' }, '— на одну карту рассчитано 100 ходов;'),
			//DOM({tag:'p'},'— кулдаун между играми 60 минут;'),
			DOM({ tag: 'p' }, '— чтобы сделать ход, переставляйте два соседних таланта местами. Если такая перестановка приводит к образованию комбинации, то «выстроившиеся»‎ таланты исчезают, и на их место падают таланты верхних рядов;'),
			DOM({ tag: 'p' }, '— засчитывается комбинация минимум из трёх одинаковых талантов;'),
			DOM({ tag: 'p' }, '— если за 100 ходов серебряных монет будет 150, даётся +100 дополнительных ходов;'),
			//DOM({tag:'p'},'— в рейтинге на главной страничке отображается сумма всех очков на одного игрока за всё время.'),
			button,
			isWindow ? DOM() : DOM({ style: 'game-button', event: ['click', () => View.show('castle')] }, Lang.text('back'))
		);

		body.append(dscription);

		return body;

	}

	static async build(heroId, targetId = 0, isWindow = false) {

		const body = DOM({ style: 'build-horizontal' });

		await Build.init(heroId, targetId, isWindow);

		body.append(
			DOM({ style: 'build-left' },
				Build.heroView
			),
			DOM({ style: 'build-center' },
				Build.buildActionsView,
				DOM({ style: 'build-field-with-tabs' },
					Build.listView,
					DOM({ style: 'build-field-container' },
						Build.levelView,
						Build.fieldView)
				),
				DOM({ style: 'build-active-bar-container' },
					Build.activeBarView,
					DOM({ style: 'build-active-bar-hint' }, Lang.text('smartcastDescription'))
				)
			),
			DOM({ style: 'build-right' },
				Build.talentsAndSetsView,
				Build.rarityView,
				Build.inventoryView
			)
		);

		if (!isWindow) {
			body.append(DOM({
				style: ['build-list-close', 'close-button'],
				title: Lang.text('titleClose'),
				event: ['click', () => {
					Build.CleanInvalidDescriptions();
					if (isWindow) {
						View.show('castle');
					} else {
						View.show('builds');
					}
				}]
			}, DOM({ tag: 'img', src: 'content/icons/close-cropped.svg', alt: Lang.text('titleClose'), style: 'close-image-style' }))); // Замените путь к изображению
		}

		return isWindow ? body : DOM({ id: 'viewbuild' }, body);

	}


	static async talents() {
		let body = DOM({ style: 'main' });
		
		// Создаем контейнер для заголовка (кнопка закрытия + поиск)
		let header = DOM({ style: 'adm-header' });
		
		// Кнопка закрытия
		let closeBtn = DOM({ 
			style: 'close-btn',
			event: ['click', () => View.show('castle')] 
		}, '[X]');
		
		// Строка поиска
		let searchInput = DOM({
			tag: 'input',
			placeholder: 'Поиск талантов...',
			style: 'search-input'
		});
		
		header.append(closeBtn, searchInput);
		
		let adm = DOM({ style: 'adm' }, header);
		let result = await App.api.request('build', 'talentAll');
		let talentContainers = [];
		let talentsContainer = DOM({ style: 'talents-container' });

		for (let item of result) {
			let div = DOM({ tag: 'div', class: 'talent-item' });
			div.append(DOM(`id${item.id}`), DOM({ tag: 'img', src: `content/talents/${item.id}.webp` }));

			for (let key in item) {
				if (key == 'id') continue;
				
				// Создаем контейнер для пары "ключ-значение"
				let keyValuePair = DOM({ 
					tag: 'div', 
					class: 'key-value-pair' 
				});
				
				keyValuePair.append(
					DOM({ tag: 'div', class: 'key' }, key),
					App.input(async (value) => {
						let object = new Object();
						object[key] = value;
						await App.api.request('build', 'talentEdit', { id: item.id, object: object });
					}, { value: item[key] })
				);
				
				div.append(keyValuePair);
			}
			
			talentContainers.push({ element: div, data: item });
			talentsContainer.append(div);
		}
		
		const filterTalents = (searchText) => {
			searchText = searchText.toLowerCase();
			talentContainers.forEach(({ element, data }) => {
				let matches = false;
				for (let key in data) {
					if (String(data[key]).toLowerCase().includes(searchText)) {
						matches = true;
						break;
					}
				}
				element.style.display = matches ? 'flex' : 'none';
			});
		};
		
		searchInput.addEventListener('input', (e) => {
			filterTalents(e.target.value);
		});
		
		adm.append(talentsContainer);
		body.append(adm);
		return body;
	}

	static async talents2() {
		let body = DOM({ style: 'main' });
		
		// Создаем контейнер для заголовка (кнопка закрытия + поиск)
		let header = DOM({ style: 'adm-header' });
		
		// Кнопка закрытия
		let closeBtn = DOM({ 
			style: 'close-btn',
			event: ['click', () => View.show('castle')] 
		}, '[X]');
		
		// Строка поиска
		let searchInput = DOM({
			tag: 'input',
			placeholder: 'Поиск геройских талантов...',
			style: 'search-input'
		});
		
		header.append(closeBtn, searchInput);
		
		let adm = DOM({ style: 'adm' }, header);
		let result = await App.api.request('build', 'talentHeroAll');
		let talentContainers = [];
		let talentsContainer = DOM({ style: 'talents-container' });

		for (let item of result) {
			let div = DOM({ tag: 'div', class: 'talent-item' });
			div.append(DOM(`id${item.id}`), DOM({ tag: 'img', src: `content/htalents/${item.id}.webp` }));

			for (let key in item) {
				if (key == 'id') continue;
				
				// Создаем контейнер для пары "ключ-значение"
				let keyValuePair = DOM({ 
					tag: 'div', 
					class: 'key-value-pair' 
				});
				
				keyValuePair.append(
					DOM({ tag: 'div', class: 'key' }, key),
					App.input(async (value) => {
						let object = new Object();
						object[key] = value;
						await App.api.request('build', 'talentHeroEdit', { id: item.id, object: object });
					}, { value: item[key] })
				);
				
				div.append(keyValuePair);
			}
			
			talentContainers.push({ element: div, data: item });
			talentsContainer.append(div);
		}
		
		const filterTalents = (searchText) => {
			searchText = searchText.toLowerCase();
			talentContainers.forEach(({ element, data }) => {
				let matches = false;
				for (let key in data) {
					if (String(data[key]).toLowerCase().includes(searchText)) {
						matches = true;
						break;
					}
				}
				element.style.display = matches ? 'flex' : 'none';
			});
		};
		
		searchInput.addEventListener('input', (e) => {
			filterTalents(e.target.value);
		});
		
		adm.append(talentsContainer);
		body.append(adm);
		return body;
	}

	static async users() {

		let filter = DOM({
			event: ['click', () => {
				let users = document.getElementsByClassName('user-item');
				for (let user in users) {
					if (users[user].className && users[user].className == 'user-item') {
						let isBlocked = users[user].getElementsByClassName('userParam-blocked')[0].nextSibling.value != '0';
						if (!isBlocked) {
							users[user].style.display = users[user].style.display == 'none' ? 'inherit' : 'none';
						}
					}
				}
			}]
		}, 'Filter only banned');

		let userMute = DOM({
			tag: 'input', placeholder: 'mute', event: ['contextmenu', (e) => {
				e.preventDefault();
				if (App.isAdmin()) {

					let userId = parseInt(userMute.value);

					if (!userId) {
						return;
					}

					let users = document.getElementsByClassName('user-item');

					let userTag = Array.from(users).findIndex(x => x.firstChild.innerText === 'id' + userId);

					let userNickname = users[userTag].children[3].value;

					let body = document.createDocumentFragment();

					body.append(DOM(`Выдать мут чата ${userNickname}?`), DOM({
						style: 'splash-content-button', event: ['click', async () => {

							await App.api.request('user', 'mute', { id: userId });

							App.notify('Выдан мут игроку ' + userNickname + '; id: ' + userId);

							Splash.hide();

						}]
					}, 'Да'), DOM({ style: 'splash-content-button', event: ['click', async () => Splash.hide()] }, 'Нет'));

					Splash.show(body);

				}
			}]
		}, '');


		let body = DOM({ style: 'main' }), adm = DOM({ style: 'adm' }, DOM({ event: ['click', () => View.show('castle')] }, '[X]'), filter, userMute);

		let result = await App.api.request('user', 'all');

		for (let item of result) {

			let div = DOM({ tag: 'div', className: 'user-item' });

			div.append(DOM(`id${item.id}`), DOM(`inv ${item.invite}`));

			for (let key in item) {

				if (['id', 'invite'].includes(key)) {

					continue;

				}

				if (key == 'added') {

					div.append(DOM(`${new Date(item.added).toLocaleString('ru-RU')}`));

					continue;

				}

				div.append(DOM({ tag: 'div', className: 'userParam-' + key }, key), App.input(async (value) => {

					let object = new Object();

					object[key] = value;

					await App.api.request('user', 'edit', { id: item.id, object: object });

				}, { value: item[key] }));

			}

			div.append(DOM({
				event: ['click', async () => {

					if (!confirm(`Сброс пароля «${item.nickname}»?`)) {

						return;

					}

					let password = await App.api.request('user', 'restore', { id: item.id });

					prompt('Сброс пароля произведен успешно', `Пароль: ${password}`);

				}]
			}, `RESTORE`));

			adm.append(div);

		}

		body.append(adm);

		return body;

	}

}

class Window {
	static windows = {}
	static async show(category, method, value, value2, value3) {
		if (!(method in Window)) {
			return;
		}
		let template = await Window[method](value, value2, value3);
		let closeButton = DOM({
			style: 'close-button',
			title: Lang.text('titleClose'),
			event: ['click', () => {
				Window.close(category);
			}]
		},
			DOM({ tag: 'img', src: 'content/icons/close-cropped.svg', alt: Lang.text('titleClose'), style: 'close-image-style' }));
		template.append(closeButton);
		if (category in Window.windows) {
			Window.windows[category].remove();
		}
		Window.windows[category] = template;
		View.active.append(template);
	}

	static close(category) {
		if (category in Window.windows) {
			Window.windows[category].remove();
			delete Window.windows[category];
			return true;
		}
		return false;
	}
	static async steamauth() {
		return DOM({ id: 'wsteamauth' },
			DOM({ style: 'castle-menu-title' }, Lang.text('steamauthTitle')),
			DOM({ style: 'castle-menu-items'},
			DOM({ style: 'castle-menu-text' }, Lang.text('steamauth')),
			DOM({ style: 'castle-menu-item-button', event: ['click', () => {
				
				ParentEvent.children = window.open('https://api2.26rus-game.ru:2087', 'SteamAuth', 'width=1280, height=720, top='+((screen.height-720)/2)+', left='+((screen.width-1280)/2)+', toolbar=no, menubar=no, location=no, scrollbars=no, resizable=no, status=no');
				
			}]}, Lang.text("continue"))			
			)
		);
	}
	static async build(heroId, targetId = 0, isWindow = false) {
		let viewBuild = await View.build(heroId, targetId, isWindow);
		return DOM({ id: 'wbuild' }, viewBuild);
	}
	static async top(hero = 0,mode = 0) {
		let viewTop = await View.top(hero, true, mode);
		return DOM({ id: 'wtop' }, viewTop);
	}
	static async farm() {
		let view = await View.game(true);
		return DOM({ id: 'wgame' }, view);
	}
	static async history() {
		let view = await View.history(true);
		return DOM({ id: 'whistory' }, view);
	}
	static async inventory() {
		let view = await View.inventory(true);
		return DOM({ id: 'winventory' }, view);
	}
	/*
	static async quest(questId,cloneNode,test) {
		let view = await View.quest(questId,cloneNode,test);
		
	}
	*/
	static async menu() {
		return DOM({ id: 'wcastle-menu' },
			DOM({ style: 'castle-menu-title' }, Lang.text('menu')),
			DOM({style: 'castle-menu-items'},
			App.isAdmin() ? DOM({ style: 'castle-menu-item-button' },
				DOM({ event: ['click', () => Window.show('main', 'adminPanel')] }, 'Админ')) : DOM(),
			DOM({ style: 'castle-menu-item-button' },
				DOM({ event: ['click', () => Window.show('main', 'accountPanel')] }, Lang.text('account'))),
			DOM({ style: 'castle-menu-item-button' },
				DOM({ event: ['click', () => Window.show('main', 'settings')] }, Lang.text('preferences'))),
			DOM({ style: 'castle-menu-item-button' },
				DOM({ event: ['click', () => Window.show('main', 'support')] }, Lang.text('support'))),
			DOM({
				style: 'castle-menu-item-button', event: ['click', async () => {
					App.exit();
					Splash.hide();
				}]
			}, Lang.text('accountSwitch')),
			DOM({
				style: 'castle-menu-item-button', event: ['click', () => {
					if (NativeAPI.status) {
						NativeAPI.exit();
					}
				}]
			}, Lang.text('exit')),
			DOM({ style: 'castle-menu-label' }, `${Lang.text('version')}: v.${PW_VERSION}`),
			DOM({ style: 'menu-icons' },
				DOM({ tag: 'a', href: 'https://vk.com/primeworldclassic', target: '_blank', event: ['click', (e) => NativeAPI.linkHandler(e)] },
					DOM({ tag: 'img', src: 'content/icons/vk.webp', alt: 'VK', style: 'menu-icons' })
				),
				DOM({ tag: 'a', href: 'https://t.me/primeworldclassic', target: '_blank', event: ['click', (e) => NativeAPI.linkHandler(e)] },
					DOM({ tag: 'img', src: 'content/icons/telegram.webp', alt: 'Telegram', style: 'menu-icons' })
				),
				DOM({ tag: 'a', href: 'https://discord.gg/MueeP3aAzh', target: '_blank', event: ['click', (e) => NativeAPI.linkHandler(e)] },
					DOM({ tag: 'img', src: 'content/icons/discord.webp', alt: 'Discord', style: 'menu-icons' })
				),
				DOM({ tag: 'a', href: 'https://store.steampowered.com/app/3684820/Prime_World_Classic', target: '_blank', event: ['click', (e) => NativeAPI.linkHandler(e)] },
					DOM({ tag: 'img', src: 'content/icons/steam2.webp', alt: 'Steam', style: 'menu-icons' })
				)
			)
		)
		)
	}

	static async settings() {
		let soundTestId = 'sound_test';
	
		return DOM({ id: 'wcastle-menu' },
			DOM({ style: 'castle-menu-title' }, Lang.text('preferences')),
			DOM({style: 'castle-menu-items'},
			DOM({ style: 'castle-menu-item-checkbox' },
				DOM({
					tag: 'input', type: 'checkbox', id: 'fullscreen-toggle', checked: !Settings.settings.fullscreen, event: ['change', (e) => {
						Settings.settings.fullscreen = !e.target.checked;
						Settings.ApplySettings({render: false, audio: false});
					}]
				},
					{ checked: Settings.settings.fullscreen }),
				DOM({ tag: 'label', for: 'fullscreen-toggle' }, Lang.text('windowMode') + ' (F11)')
			),
			DOM({ style: 'castle-menu-item-checkbox' },
            	DOM({
                	tag: 'input',
                	type: 'checkbox',
                	id: 'render-toggle',
                	checked: Settings.settings.render,
                	event: ['change', (e) => {
                    	Settings.settings.render = e.target.checked;
                    	Settings.ApplySettings({audio: false, window: false});
                	}]
            	}),
            	DOM({ tag: 'label', for: 'render-toggle' }, Lang.text('threeD'))
        	),
			DOM({ style: 'castle-menu-item-checkbox' },
				DOM({
					tag: 'input', type: 'checkbox', id: 'radmin-priority', checked: Settings.settings.radminPriority, event: ['change', (e) => {
						Settings.settings.radminPriority = e.target.checked;
					}]
				},
					{ checked: Settings.settings.radminPriority }),
				DOM({ tag: 'label', for: 'radmin-priority' }, Lang.text('radminPriority'))
			),
			DOM({ style: 'castle-menu-item-checkbox' },
				DOM({
					tag: 'input', type: 'checkbox', id: 'novoice', checked: Settings.settings.novoice, event: ['change', (e) => {
						Settings.settings.novoice = e.target.checked;
					}]
				},
					{ checked: Settings.settings.novoice }),
				DOM({ tag: 'label', for: 'novoice' }, Lang.text('voiceEnabled'))
			),
			DOM({ style: 'castle-menu-label' }, Lang.text('volume'),
            	DOM({
                	tag: 'input',
                	type: 'range',
                	value: Settings.settings.globalVolume * 100,
                	min: '0',
                	max: '100',
                	step: '1',
                	style: 'castle-menu-slider',
                	event: ['input', (e) => {
                    	Settings.settings.globalVolume = parseFloat(e.target.value) / 100;
                    	Settings.ApplySettings({render: false, window: false});
																	  
																		  
                    	document.getElementById('global-volume-percentage').textContent = 
                        	`${Math.round(Settings.settings.globalVolume * 100)}%`;
                	}]
            	}),
				DOM({ 
					tag: 'span', 
					id: 'global-volume-percentage', 
					style: 'volume-percentage' 
				}, `${Math.round(Settings.settings.globalVolume * 100)}%`)
			),
			DOM({ style: 'castle-menu-label' }, Lang.text('volumeMusic'),
				DOM({
					tag: 'input', 
					type: 'range', 
					value: Settings.settings.musicVolume * 100, 
					min: '0', 
					max: '100', 
					step: '1',
					style: 'castle-menu-slider', 
					event: ['input', (e) => {
						Settings.settings.musicVolume = parseFloat(e.target.value) / 100;
						Settings.ApplySettings({render: false, window: false});
																	  
						document.getElementById('music-volume-percentage').textContent = 
							`${Math.round(Settings.settings.musicVolume * 100)}%`;
					}]
				}),
				DOM({ 
					tag: 'span', 
					id: 'music-volume-percentage', 
					style: 'volume-percentage' 
				}, `${Math.round(Settings.settings.musicVolume * 100)}%`)
			),
			DOM({ style: 'castle-menu-label' }, Lang.text('volumeSound'),
				DOM({
					tag: 'input', 
					type: 'range', 
					value: Settings.settings.soundsVolume * 100, 
					min: '0', 
					max: '100', 
					step: '1',
					style: 'castle-menu-slider', 
					event: ['input', (e) => {
						Settings.settings.soundsVolume = parseFloat(e.target.value) / 100;
						Settings.ApplySettings({render: false, window: false});
						
						if (!Castle.testSoundIsPlaying) {
							Castle.testSoundIsPlaying = true;
							Sound.play('content/sounds/found.ogg', { 
								id: soundTestId, 
								volume: Castle.GetVolume(Castle.AUDIO_SOUNDS) 
							}, () => { 
								Castle.testSoundIsPlaying = false 
							});
						}
																		  
						document.getElementById('sounds-volume-percentage').textContent = 
							`${Math.round(Settings.settings.soundsVolume * 100)}%`;
					}]
				}),
				DOM({ 
					tag: 'span', 
					id: 'sounds-volume-percentage', 
					style: 'volume-percentage' 
				}, `${Math.round(Settings.settings.soundsVolume * 100)}%`)
			),
			DOM({ 
    			style: 'castle-menu-item-button',
    			event: ['click', async (e) => {
					const oldLanguage = Lang.target;
        			Lang.toggle();
        			Settings.settings.language = Lang.target;
					App.error(`${Lang.text('LangTarg')}: ${Lang.list[oldLanguage].name} → ${Lang.list[Lang.target].name}`);
					await Lang.reinitViews();
					await Window.show('main', 'settings');
    			}]
				}, `${Lang.text('language')} (${Lang.target})`
			),
			// Добавленная кнопка "Клавиши"
			/*DOM({ 
				style: 'castle-menu-item-button',
				event: ['click', () => {
					console.log("Клавиши clicked"); // Для отладки
					Window.show('main','keybindings'); 
				}]
			}, Lang.text('keys') || 'Клавиши'), // Fallback на текст, если перевод отсутствует
			*/
			// Кнопка "Назад"
			DOM({ 
				style: 'castle-menu-item-button', 
				event: ['click', () => {
				Window.show('main', 'menu');
				}]
			}, Lang.text('back'))
			/*,
			
			DOM({ style: 'castle-menu-label-description' }, Lang.text('soundHelp'))
			*/
		)
		);
	}

	static async keybindings() {
    async function findConfigFile() {
        const possiblePaths = [
            `${nw.App.getDataPath('documents')}/My Games/Prime World Classic/input_new.cfg`,
            `${process.env.USERPROFILE}/Documents/My Games/Prime World Classic/input_new.cfg`,
            `${process.env.USERPROFILE}/OneDrive/Documents/My Games/Prime World Classic/input_new.cfg`
        ];
        
        for (const path of possiblePaths) {
            try {
                await fs.access(path);
                return path;
            } catch (e) {
                continue;
            }
        }
        return null;
    }

    const configPath = await findConfigFile();
    
    if (!configPath) {
        console.error("Не удалось найти файл конфигурации ни по одному из путей");
        return DOM({ id: 'wcastle-keybindings' },
            DOM({ style: 'castle-menu-error' }, 
                Lang.text('keybindings_error', 'Не удалось найти файл конфигурации клавиш')
            ),
            DOM({ 
                class: 'castle-menu-item-button',
                event: ['click', () => Window.show('settings', 'menu')]
            }, Lang.text('back', 'Назад'))
        );
    }

    const defaultKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    
    let currentBinds = {};
    let configReadError = false;
    
    try {
        const configContent = await fs.readFile(configPath, 'utf-8');
        const bindRegex = /bind cmd_action_bar_slot(\d+) '(.+?)'/g;
        let match;
        
        while ((match = bindRegex.exec(configContent)) !== null) {
            currentBinds[`slot${match[1]}`] = match[2];
        }
    } catch (e) {
        console.error("Ошибка чтения конфига:", e);
        configReadError = true;
    }

    return DOM({ id: 'wcastle-keybindings' },
        DOM({ style: 'castle-menu-title' }, Lang.text('keybindings_title', 'Настройка клавиш')),
        
        configReadError 
            ? DOM({ style: 'castle-menu-error' }, 
                Lang.text('keybindings_error', 'Не удалось прочитать файл конфигурации клавиш. Проверьте путь:') + ' ' + configPath
              )
            : DOM({},
                ...Array.from({ length: 10 }, (_, i) => {
                    const slotNum = i + 1;
                    const slotKey = `slot${slotNum}`;
                    const currentKey = currentBinds[slotKey] || defaultKeys[i];
                    
                    return DOM({ style: 'castle-menu-label keybinding-row' }, 
                        DOM({ style: 'keybinding-label' }, 
                            Lang.text(`talent_slot_${slotNum}`, `Талант ${slotNum}`)
                        ),
                        DOM({
                            tag: 'input',
                            type: 'text',
                            value: currentKey,
                            class: 'castle-keybinding-input',
                            maxLength: 1,
                            event: [
                                'keydown',
                                (e) => {
                                    if (e.key === 'Backspace' || e.key === 'Delete') {
                                        e.target.value = '';
                                        currentBinds[slotKey] = '';
                                        return;
                                    }
                                    
                                    if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) {
                                        return;
                                    }
                                    
                                    e.preventDefault();
                                    const key = e.key.toUpperCase();
                                    
                                    if (/^[0-9A-Z]$/.test(key)) {
                                        e.target.value = key;
                                        currentBinds[slotKey] = key;
                                        e.target.classList.add('input-success');
                                        setTimeout(() => e.target.classList.remove('input-success'), 200);
                                    } else {
                                        e.target.classList.add('input-error');
                                        setTimeout(() => e.target.classList.remove('input-error'), 200);
                                    }
                                }
                            ]
                        })
                    );
                }),
                
                DOM({ 
                    class: 'castle-menu-item-button reset-btn',
                    event: ['click', () => {
                        document.querySelectorAll('.castle-keybinding-input').forEach((input, i) => {
                            input.value = defaultKeys[i];
                            currentBinds[`slot${i+1}`] = defaultKeys[i];
                        });
                        
                        const btn = document.querySelector('.reset-btn');
                        btn.classList.add('action-success');
                        btn.textContent = Lang.text('reset_complete', 'Сброшено!');
                        setTimeout(() => {
                            btn.classList.remove('action-success');
                            btn.textContent = Lang.text('reset_defaults', 'Сбросить на 1-0');
                        }, 1000);
                    }]
                }, Lang.text('reset_defaults', 'Сбросить на 1-0')),
                
                DOM({ 
                    class: 'castle-menu-item-button save-btn',
                    event: ['click', async () => {
                        try {
                            let newConfig = '';
                            for (let i = 1; i <= 10; i++) {
                                const key = currentBinds[`slot${i}`] || defaultKeys[i-1];
                                newConfig += `bind cmd_action_bar_slot${i} '${key}'\n`;
                            }
                            
                            await fs.writeFile(configPath, newConfig);
                            
                            const btn = document.querySelector('.save-btn');
                            btn.classList.add('action-success');
                            btn.textContent = Lang.text('saved', 'Сохранено!');
                            setTimeout(() => {
                                btn.classList.remove('action-success');
                                btn.textContent = Lang.text('save', 'Сохранить');
                            }, 1000);
                            
                        } catch (e) {
                            console.error("Ошибка сохранения:", e);
                            const btn = document.querySelector('.save-btn');
                            btn.classList.add('action-error');
                            btn.textContent = Lang.text('save_error', 'Ошибка!');
                            setTimeout(() => {
                                btn.classList.remove('action-error');
                                btn.textContent = Lang.text('save', 'Сохранить');
                            }, 1000);
                        }
                    }]
                }, Lang.text('save', 'Сохранить'))
            ),
        
        DOM({ 
            class: 'castle-menu-item-button',
            event: ['click', () => Window.show('settings', 'menu')]
        }, Lang.text('back', 'Назад'))
    );
}
	
	static async support() {
		return DOM({ id: 'wcastle-menu' },
			DOM({ style: 'castle-menu-title' }, Lang.text('support')),
			DOM({style: 'castle-menu-items'},
			DOM({ style: 'castle-menu-text' }, Lang.text('supportDesk')),
			DOM({ style: 'menu-icons' },
				DOM({ tag: 'a', href: 'https://vk.me/join/AZQ1dy/d2Qg98tKilOoQ1u34', target: '_blank', event: ['click', (e) => NativeAPI.linkHandler(e)] },
					DOM({ tag: 'img', src: 'content/icons/vk.webp', alt: 'VK', style: 'support-icon' })
				),
				DOM({ tag: 'a', href: 'https://t.me/primeworldclassic/8232', target: '_blank', event: ['click', (e) => NativeAPI.linkHandler(e)] },
					DOM({ tag: 'img', src: 'content/icons/telegram.webp', alt: 'Telegram', style: 'support-icon' })
				),
				DOM({ tag: 'a', href: 'https://discord.gg/S3yrbFGT86', target: '_blank', event: ['click', (e) => NativeAPI.linkHandler(e)] },
					DOM({ tag: 'img', src: 'content/icons/discord.webp', alt: 'Discord', style: 'support-icon' })
				)
			),
			DOM({ style: 'castle-menu-item-button', event: ['click', () => Window.show('main', 'menu')] }, Lang.text('back'))
		)
		);
	}
	static async adminPanel() {
		return DOM({ id: 'wcastle-menu' },
			DOM({ style: 'castle-menu-title' }, 'Админ Панель'),
			DOM({
				style: 'castle-menu-item-button', event: ['click', () => {
					View.show('talents'); // Логика для отображения обычных талантов
				}]
			}, 'Таланты (обычные)'),
			DOM({
				style: 'castle-menu-item-button', event: ['click', () => {
					View.show('talents2'); // Логика для отображения классовых талантов
				}]
			}, 'Таланты (классовые)'),
			DOM({
				style: 'castle-menu-item-button', event: ['click', () => {
					View.show('users'); // Логика для управления пользователями
				}]
			}, 'Пользователи'),
			DOM({ style: 'castle-menu-item-button', event: ['click', () => Window.show('main', 'menu')] }, Lang.text('back'))
		);
	}
	static async accountPanel() { 
	return DOM({ id: 'wcastle-menu' },
		DOM({ style: 'castle-menu-title' }, Lang.text('account')),
		DOM({
			style: 'castle-menu-item-button', event: ['click', () => {
				ParentEvent.children = window.open(
					`https://api2.26rus-game.ru:2087/connect/${App.storage.data.token}`,
					`SteamAuth`,
					'width=1280, height=720, top='+((screen.height-720)/2)+', left='+((screen.width-1280)/2)+', toolbar=no, menubar=no, location=no, scrollbars=no, resizable=no, status=no'
				);
			}]
		}, Lang.text('steamConnect')),
		DOM({
			style: 'castle-menu-item-button', event: ['click', () => {
				App.setNickname();
			}]
		}, Lang.text('nicknameChange')),
		DOM({
			style: 'castle-menu-item-button', event: ['click', () => {
				App.setFraction();
			}]
		}, Lang.text('sideChange')),
		DOM({ style: 'castle-menu-item-button', event: ['click', () => Window.show('main', 'menu')] }, Lang.text('back'))
	);
}

	
}

// Функция для обработки нажатия клавиш
function handleKeyPress(event) {
	if (event.key === "Escape") {
		// Вызываем метод show для открытия меню
		if (!Window.close('main')) {
			Window.show('main', 'menu');
		}
	}
}

// Добавляем обработчик события нажатия клавиш
document.addEventListener('keydown', handleKeyPress);

class Frame {

	static body = false;

	static open(method) {

		if (!Frame.body) {

			Frame.inject();

		}

		if (method in Frame) {

			Frame[method]();

		}

	}

	static inject() {

		Frame.body = DOM({ style: 'frame-body' });

		document.body.prepend(DOM({ style: 'frame' }, Frame.body));
		let test = DOM({ tag: 'div' }, 'width:100%');

		test.setAttribute('style', 'width:100%;background:green;text-align:center;font-size:5cqw');
		Frame.body.append(test);

	}

	static clan() {



	}



}

class Winrate {

	static icon(number) {

		if (number <= 25) {

			return 3;

		}
		else if (number <= 50) {

			return 2;

		}
		else {

			return 1;

		}

	}

}

class Rank {

	static name = ['', 'Рекрут', 'Наёмник', 'Рядовой', 'Капрал', 'Сержант', 'Лейтенант', 'Капитан', 'Майор', 'Подполковник', 'Полковник', 'Генерал', 'Маршал', 'Бог'];

	static icon(rating) {

		if (rating <= 1199) {

			return 1;

		}
		else if (rating <= 1299) {

			return 2;

		}
		else if (rating <= 1399) {

			return 3;

		}
		else if (rating <= 1499) {

			return 4;

		}
		else if (rating <= 1599) {

			return 5;

		}
		else if (rating <= 1699) {

			return 6;

		}
		else if (rating <= 1799) {

			return 7;

		}
		else if (rating <= 1899) {

			return 8;

		}
		else if (rating <= 1999) {

			return 9;

		}
		else if (rating <= 2099) {

			return 10;

		}
		else if (rating <= 2199) {

			return 11;

		}
		else {

			return 12;

		}

	}

	static getName(rating) {

		return Rank.name[Rank.icon(rating)];

	}

}

class Division {
	
	static list = {
	10:{name:'Рядовой',icon:3}, 
	20:{name:'Капрал',icon:4},  
	30:{name:'Сержант',icon:5}, 
	40:{name:'Лейтенант',icon:6}, 
	50:{name:'Капитан',icon:7},  
	60:{name:'Майор',icon:8},  
	70:{name:'Подполковник',icon:9}, 
	80:{name:'Полковник',icon:10},  
	90:{name:'Генерал',icon:11}, 
	100:{name:'Маршал',icon:12} 
	};
	
	static get(id){
		
		for(let key in Division.list){
			
			if(id <= key){
				
				return Division.list[key];
				
			}
			
		}
		
		return {name:'Не определено',icon:1};
		
	}
	
}

class Build {

	static loading = false;

	static language = {
		sr: 'Сила/Разум',
		hp: 'Здоровье',
		provorstvo: 'Проворство',
		hitrost: 'Хитрость',
		regenmp: 'Регенерация энергии',
		stoikost: 'Стойкость',
		volia: 'Воля',
		ph: 'Проворство/Хитрость',
		sv: 'Стойкость/Воля',
		razum: 'Разум',
		sila: 'Сила',
		speedtal: '%<speedtal></speedtal>',
		srsv: 'Сила/Разум/Стойкость/Воля',
		hpmp: 'Здоровье/Энергия',
		krajahp: 'Кража здоровья',
		regenhp: 'Регенерация здоровья',
		mp: 'Энергия',
		krajamp: 'Кража энергии',
		stoikostrz: 'Стойкость на родной земле',
		voliarz: 'Воля на родной земле',
		speedtalrz: '%<speedtal></speedtal> на родной земле',
		speedtalvz: '%<speedtal></speedtal> на вражеской земле',
		hitrostrz: 'Хитрость на родной земле',
		provorstvorz: 'Проворство на родной земле',
		silarz: 'Сила на родной земле',
		razumrz: 'Разум на родной земле',
		krajahprz: 'Кража здоровья на родной земле',
		regenhpvz: 'Регенерация здоровья на вражеской земле',
		hitrostvz: 'Хитрость на вражеской земле',
		provorstvovz: 'Проворство на вражеской земле',
		regenmpvz: 'Регенерация энергии на вражеской земле',
		silavz: 'Сила на вражеской земле',
		razumvz: 'Разум на вражеской земле',
		svvz: 'Стойкость/Воля на вражеской земле',
		krajahpvz: 'Кража здоровья на вражеской земле',
		vs: 'Воля/Стойкость',
		speed: 'Скорость',
		speedrz: 'Скорость на родной земле',
		speedvz: 'Скорость на вражеской или нейтральной земле',
		dopspeed: 'Дополнительный бонус к скорости',
		speedstak: 'Стак скорости',
	};

	static talentRefineByRarity = {
		4: 5.0, //И классовые
		3: 7.0,
		2: 9.0,
		1: 12.0
	}
	
	static talentPowerByRarityFirstLevel = {
		4: 53.04,
		3: 47.04,
		2: 43.2,
		1: 36,
		0: 45.12
	}
	
	static talentPowerByRarityPerLevel = {
		4: 3.978,
		3: 3.528,
		2: 3.24,
		1: 2.625,
		0: 11.28
	}
	
	static async view(user, hero, nickname = '', animate = true) {

		let request = await App.api.request('build', 'get', { user: user, hero: hero });

		let container = DOM({
			event: ['click', async () => {

				if (animate) {
					Build.view(user, hero, nickname, false);
				}

			}]
		});

		container.style.width = '60cqmin';

		container.style.height = '60cqmin';

		let state = false;
		let get = DOM({
			event: ['click', async () => {

				if (!state) {

					get.innerText = 'Перезаписать текущий билд?';

					state = true;

					return;

				}

				await App.api.request('build', 'steal', { user: user, hero: hero });
				
				await Window.show('main', 'build', hero, 0, true);

				Splash.hide();

			}]
		}, `Украсть билд?`);

		let bottom = DOM({ style: 'build-bottom' }, get, DOM({ event: ['click', () => Splash.hide()] }, `[Х]`));

		if (animate) {

			bottom.style.opacity = 1;

		}

		container.append(Build.viewModel(request, () => { }, animate));

		Splash.show(DOM({ style: 'div' }, DOM({ style: 'build-top' }, nickname), container, bottom), false);

	}

	static viewModel(data, callback, animate = true) {

		let body = DOM({ style: 'build-body' }), i = 1, row = DOM({ style: 'build-body-row' }), elements1 = new Array(), elements2 = new Array();

		body.append(row);

		for (let item of data) {

			let talent = DOM();

			if (item != 0) {

				if (animate) {

					talent.style.opacity = 0;

					talent.style.zIndex = 9999;

					if (item > 0) {

						elements2.push(talent);

					}
					else {

						elements1.push(talent);

					}

				}

				talent.style.backgroundImage = (item > 0) ? `url(content/talents/${item}.webp)` : `url(content/htalents/${Math.abs(item)}.webp)`;

			}

			if (i > 6) {

				i = 2;

				row = DOM({ style: 'build-body-row' });

				row.append(talent);

				body.append(row);

				continue;

			}
			else {

				row.append(talent);

			}

			i++;

		}

		if (!animate) {

			return body;

		}

		elements1 = Game.shuffle(elements1);

		elements2 = Game.shuffle(elements2);

		let delay = 0, number = 1;

		for (let element of elements1) {

			delay += 150;

			let animate = element.animate({ opacity: [0, 1], transform: ['scale(3)', 'scale(1)'] }, { delay: delay, duration: 350, fill: 'both', easing: 'ease-out' });

			if (number == elements1.length) {

				animate.onfinish = () => {

					setTimeout(() => {

						let number = 1;

						delay = 0;

						for (let element of elements2) {

							delay += 50;

							let animate = element.animate({ opacity: [0, 1], transform: ['scale(3)', 'scale(1)'] }, { delay: delay, duration: 350, fill: 'both', easing: 'ease-out' });

							if (number == elements2.length) {

								animate.onfinish = () => {

									if (callback) {

										callback();

									}

								}

							}

							number++;

						}

					}, 100);

				}

			}

			number++;

		}

		return body;

	}

	static async init(heroId, targetId, isWindow) {

		Build.talents = new Object();

		Build.descriptionView = document.createElement('div');

		Build.CleanInvalidDescriptions();

		Build.descriptionView.classList.add('build-description');

		Build.descriptionView.style.display = 'none';

		Build.descriptionView.onmouseover = () => {

			Build.descriptionView.style.display = 'none';

		}

		document.body.append(Build.descriptionView);

		Build.heroView = document.createElement('div');
		Build.heroView.classList.add('build-hero');

		Build.levelView = document.createElement('div');
		Build.levelView.classList.add('build-level');

		Build.fieldView = document.createElement('div');
		Build.fieldView.classList.add('build-field');

		Build.listView = document.createElement('div');
		Build.listView.classList.add('build-list');

		Build.buildActionsView = document.createElement('div');
		Build.buildActionsView.classList.add('build-actions-view');

		Build.fieldConflict = new Object();

		// ================================================

		const buttonTalents = document.createElement('button');
		buttonTalents.innerText = 'Таланты';
		buttonTalents.title = 'TODO еще не готово - команда PW Classic работает над этим';
		buttonTalents.classList.add('btn-talents', 'btn-hover', 'color-1');
		buttonTalents.title = 'Библиотека талантов';

		const separator = document.createElement('div');
		separator.innerText = '|';
		separator.classList.add('btn-separator');


		const buttonSets = document.createElement('button');
		buttonSets.innerText = 'Сеты';
		buttonSets.title = 'TODO еще не готово - команда PW Classic работает над этим';
		buttonSets.classList.add('btn-sets', 'btn-hover', 'color-1');

		buttonSets.addEventListener('click', () => Build.sets());

		Build.talentsAndSetsView = document.createElement('div');
		Build.talentsAndSetsView.classList.add('buttons-talents-and-sets');
		Build.talentsAndSetsView.append(buttonTalents, separator, buttonSets);

		const buildTalents = DOM({ style: 'build-talents' });

		Build.inventoryView = document.createElement('div');
		Build.inventoryView.classList.add('build-talent-view');

		Build.skinView = DOM({
			tag: 'button',
			style: ['btn-skins', 'btn-hover', 'color-3'],
			title: Lang.text('titleSkinsForTheHero'),
			event: ['click', async () => Build.skinChange()]
		},
			Lang.text('skins')
		);

		Build.training = DOM({
			tag: 'button',
			style: ['btn-skins', 'btn-hover', 'color-3'],
			title: Lang.text('titletraining'),
			event: ['click', async () => {

				try {

					if (NativeAPI.status) {

						await MM.gameStartCheck();

						await App.api.request(CURRENT_MM, 'heroParty', { id: MM.partyId, hero: Build.heroId });

						await App.api.request(CURRENT_MM, 'start', { version: PW_VERSION, mode: 99, mac: NativeAPI.getMACAdress() });

					}
					else {

						App.error('Необходима Windows версия лаунчера');

					}

				}
				catch (error) {

					return App.error(error);

				}

			}]
		},
			Lang.text('training')
		);

		Build.inventoryView.append(buildTalents);


		// ================================================

		Build.rarityView = DOM({ style: 'build-rarity' });

		Build.activeBarView = DOM({ style: 'build-active-bar' });

		let request = await App.api.request('build', 'data', { heroId: heroId, target: targetId });

		Build.dataRequest = request;

		Build.id = request.id;

		Build.heroId = heroId;

		Build.dataStats = new Object();
		Build.calculationStats = new Object();
		Build.initialStats = new Object();
		Build.heroPower = 0.0;
		Build.heroStatsFromPower = {
			hp: 0.0,
			mp: 0.0,
			sila: 0.0,
			razum: 0.0,
			provorstvo: 0.0,
			hitrost: 0.0,
			stoikost: 0.0,
			volia: 0.0
		}
		Build.installedTalents = new Array(36).fill(null);
		Build.profileStats = new Object();

		Build.applyRz = true;
		Build.applyVz = false;
		Build.applyStak = true;
		Build.applyBuffs = true;

		Build.list(request.build, isWindow);
		Build.buildActions(request.build, isWindow);

		request.hero.stats['damage'] = 0;
		request.hero.stats['critProb'] = 0;
		request.hero.stats['attackSpeed'] = 0;
		request.hero.stats['punching'] = 0;
		request.hero.stats['protectionBody'] = 0;
		request.hero.stats['protectionSpirit'] = 0;
		Build.hero(request.hero);

		Build.level();

		Build.field(request.body);

		Build.inventory();

		Build.rarity();

		Build.activeBar(request.active);

		Build.ruleSortInventory = new Object();

	}

	static CleanInvalidDescriptions() {
		let invalidDescriptions = document.getElementsByClassName('build-description');
		for (let descElement in invalidDescriptions) {
			if (invalidDescriptions[descElement].className && invalidDescriptions[descElement].className == 'build-description') {
				console.log('Удалено протухшее описание');
				invalidDescriptions[descElement].remove();
			}
		}
	}

	static async sets() {

		let sets = await App.api.request('build', 'sets');

		for (let set of sets) {

			console.log(set);

		}

	}

	static skinChange() {

		let bodyHero = DOM({ style: 'skin-change' });

		let preload = new PreloadImages(bodyHero);

		for (let i = 0; i < Build.dataRequest.hero.skin.total; i++) {

			let hero = DOM();

			hero.dataset.url = `content/hero/${Build.heroId}/${(i + 1)}.webp`;

			hero.dataset.skin = (i + 1);

			hero.addEventListener('click', async () => {

				await App.api.request('build', 'skinChange', { hero: Build.heroId, skin: hero.dataset.skin });

				Build.heroImg.style.backgroundImage = `url(content/hero/${Build.heroId}/${hero.dataset.skin}.webp)`;

				Splash.hide();

				try {

					let heroItem = View.castleBottom.querySelector(`#id${Build.heroId}`);

					heroItem.style.backgroundImage = `url(content/hero/${Build.heroId}/${hero.dataset.skin}.webp)`;

					let heroName = heroItem.querySelector('.castle-item-hero-name');

					heroName.firstChild.innerText = Lang.heroName(Build.heroId, hero.dataset.skin);

				} catch (e) {
					App.error(e);
				}

				//View.bodyCastleHeroes();
				
				//await App.ShowCurrentViewAsync();

			});

			preload.add(hero);

		}

		Splash.show(bodyHero, false);

	}

	static buildSelectName(method, btnName, data, isWindow) {

		const close = DOM({
			tag: 'div', style: 'close-button', event: ['click', () => Splash.hide()]
		});
		
		close.style.backgroundImage = 'url(content/icons/close-cropped.svg)';
		
		let template = document.createDocumentFragment();

		let name = DOM({ tag: 'input', placeholder: 'Наименование билда' });

		let button = DOM({
			style: 'splash-content-button', event: ['click', async () => {

				if (!name.value) {

					Splash.hide();

				}

				data['name'] = name.value;

				await App.api.request('build', method, data);

				Splash.hide();

				isWindow ? Window.show('main', 'build', Build.heroId, 0, true) : View.show('build', Build.heroId);

			}]
		}, btnName);

		template.append(name, button, close);

		Splash.show(template);

	}
	


	static buildActions(builds, isWindow) {
		if (builds.length < 6) {
			const create = DOM({
				tag: 'button', style: ['build-action-item', 'btn-hover', 'color-1'],
				title: Lang.text('titleCreateANewBuildTab'),
				event: ['click', () => Build.buildSelectName('create', 'Создать билд', { heroId: Build.heroId }, isWindow)]
			});

			let createBg = DOM({ style: ['btn-create', 'build-action-item-background'] });
			createBg.style.backgroundImage = `url('content/icons/plus.svg')`;
			create.append(createBg);
			Build.buildActionsView.append(create);
		}

		// Кнопка дублирования
		
		const duplicate = DOM({
		tag: 'button', 
		style: ['build-action-item', 'btn-hover', 'color-1'],
		title: Lang.text('titleDuplicateTheCurrentBuild'),
		event: ['click', async () => {
			// Сохраняем ID текущего билда до любых действий
			const currentBuildId = Build.id;
			
			const fragment = document.createDocumentFragment();
			const title = DOM({ style: 'splash-text' }, builds.length >= 6 
				? 'Достигнут лимит билдов (6). Выберите билд для замены:' 
				: 'Выберите билд для замены или создайте новый:');
			fragment.append(title);
			
			// Показываем все билды кроме текущего
			builds.filter(build => build.id !== currentBuildId).forEach(build => {
				const btn = DOM({
					tag: 'button',
					style: ['build-replace-btn', 'btn-hover'],
					event: ['click', async () => {
						await App.api.request('build', 'duplicate', {
							id: currentBuildId,
							target: build.id
						});
						Splash.hide();
				
						isWindow ? Window.show('main', 'build', Build.heroId, 0, true) : View.show('build', Build.heroId);
					}]
				}, build.name);
				fragment.append(btn);
			});
			
			// Если билдов меньше 6, добавляем кнопку создания нового
			if (builds.length < 6) {
				const createNewBtn = DOM({
					tag: 'button',
					style: ['build-replace-btn', 'btn-hover', 'color-1'],
					event: ['click', async () => {
						Splash.hide();
						
						// Создаем форму для имени нового билда
						const close = DOM({
							tag: 'div', style: 'close-button', event: ['click', () => Splash.hide()]
						});
						close.style.backgroundImage = 'url(content/icons/close-cropped.svg)';
						
						let template = document.createDocumentFragment();
						let name = DOM({ tag: 'input', placeholder: 'Наименование билда' });

						let button = DOM({
							style: 'splash-content-button', 
							event: ['click', async () => {
								if (!name.value) {
									Splash.hide();
									return;
								}

								// Сначала создаем новый билд
								const createData = { heroId: Build.heroId, name: name.value };
								const createResponse = await App.api.request('build', 'create', createData);
								console.log(currentBuildId);
								console.log(createResponse);
								// Затем дублируем сохраненный билд в новый
								
								await App.api.request('build', 'duplicate', 
								{
									id: currentBuildId,
									target: createResponse
								});
								

								Splash.hide();
								isWindow ? Window.show('main', 'build', Build.heroId, 0, true) : View.show('build', Build.heroId);
							}]
						}, 'Создать и дублировать');

						template.append(name, button, close);
						Splash.show(template);
					}]
				}, 'Дублировать в новый билд');
				fragment.append(createNewBtn);
			}
			
			// Добавляем крестик для закрытия вместо кнопки "Отмена"
			const closeButton = DOM({
				tag: 'div',
				style: 'close-button',
				event: ['click', () => Splash.hide()]
			});
			closeButton.style.backgroundImage = 'url(content/icons/close-cropped.svg)';
			fragment.append(closeButton);
			
			Splash.show(fragment);
		}]
	});

	let duplicateBg = DOM({ style: ['btn-duplicate'] });
	duplicateBg.style.backgroundImage = `url('content/icons/copy.svg')`;
	duplicate.append(duplicateBg);
	Build.buildActionsView.append(duplicate);

	

		// Кнопка случайного билда
		{
			const random = DOM({
				tag: 'button', style: ['build-action-item', 'btn-hover', 'color-1'],
				title: Lang.text('titleGenerateARandomBuild'),
				event: ['click', async () => {
					await App.api.request('build', 'random', { id: Build.id });
					isWindow ? Window.show('main', 'build', Build.heroId, 0, true) : View.show('build', Build.heroId);
				}]
			});

			let randomBg = DOM({ style: ['btn-random', 'build-action-item-background'] });
			randomBg.style.backgroundImage = `url('content/icons/dice.svg')`;
			random.append(randomBg);
			Build.buildActionsView.append(random);
		}

		// Кнопка сброса билда
		{
			const resetBuild = DOM({
				tag: 'button', 
				style: ['build-action-item', 'btn-hover', 'color-1'],
				title: Lang.text('titleResetTalentsInThisBuild'),
				event: ['click', async () => {
					const fragment = document.createDocumentFragment();
					const title = DOM({ style: 'splash-text' }, 'Сбросить таланты в этом билде?');
					fragment.append(title);
					
					// Красная кнопка сброса
					const reset = DOM({
						tag: 'button',
						style: ['build-replace-btn', 'btn-hover'],
						event: ['click', async () => {
							await App.api.request('build', 'clear', { id: Build.id });
							Splash.hide();
							isWindow ? Window.show('main', 'build', Build.heroId, 0, true) : View.show('build', Build.heroId);
						}]
					}, 'Сбросить');
					
					// Явно задаём красный цвет
					reset.style.backgroundColor = '#7b001c';
					reset.style.color = 'white';
					reset.style.borderColor = '#ff3333';
					reset.addEventListener('mouseover', () => {
						reset.style.backgroundColor = '#ff3333';
					});
					reset.addEventListener('mouseout', () => {
						reset.style.backgroundColor = '#7b001c';
					});
					
					fragment.append(reset);
					
					let closeButton = DOM({
						tag: 'div',
						style: 'close-button',
						event: ['click', () => Splash.hide()]
					});
					closeButton.style.backgroundImage = 'url(content/icons/close-cropped.svg)';
					fragment.append(closeButton);
					Splash.show(fragment);
				}]
			});

			let resetBg = DOM({ style: ['btn-trash', 'build-action-item-background'] });
			resetBg.style.backgroundImage = `url('content/icons/trash.svg')`;
			resetBuild.append(resetBg);
			Build.buildActionsView.append(resetBuild);
		}
	}
	
	static list(builds, isWindow) {
    const buildButtonsWrapper = DOM({ style: 'build-list' });

    for (let build of builds) {
        const item = DOM(
            {
                tag: 'button', style: ['build-tab-item', 'btn-hover'], event: [
                    'click', () => {
                        isWindow ? Window.show('main', 'build', Build.heroId, build.id, true) : View.show('build', Build.heroId, build.id);
                    }]
            },
            DOM({}, `${build.name}`),
        );
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            Build.buildSelectName('rename', 'Переименовать билд', { id: build.id }, isWindow);
        });

        const div = DOM({ tag: 'div', style: 'button-build--wrapper' }, item);

        if (build.target) {
            item.classList.add('list-highlight');
        } else {
            item.classList.add('list-not-highlight');
        }

        Build.listView.append(div);
    }

    // Добавляем обработчик колесика мыши после создания списка
    setTimeout(() => {
        const buildList = document.querySelector('.build-list');
        if (buildList) {
            buildList.addEventListener('wheel', function(e) {
                e.preventDefault();
                this.scrollLeft += e.deltaY;
                
                // Опционально: можно добавить множитель для скорости прокрутки
                // this.scrollLeft += e.deltaY * 2;
            });
        }
    }, 0);

    /*
    setTimeout(_ => {
        if (!document.querySelector('.build-list.list-highlight')) {
            document.querySelector('.build-list').classList.add('list-highlight');
        }
    }, 300);
    */
}

	static totalStat(stat) {

		let initialStat = Build.initialStats[stat];
		let talentsStat = Build.calculationStats[stat];
		let powerStat = 0.0;
		if (stat in Build.heroStatsFromPower) {
			powerStat += Build.heroStatsFromPower[stat];
		}
		return initialStat + talentsStat + powerStat;
	}

	static hero(data) {

		Build.heroStatMods = Build.dataRequest.hero.statModifiers;

		Build.heroPowerModifier = Build.dataRequest.hero.overallModifier;

		Build.heroPowerFromInstalledTalents = 0.0;

		Build.heroMainAttackStat = data.param; // osn_param
		Build.heroAttackModifier = data.koef; // aa_koef 

		for (let stat in data.stats) {
			Build.initialStats[stat] = parseFloat(data.stats[stat]);
			Build.calculationStats[stat] = 0.0;
		}

		let stats = DOM({ style: 'build-hero-stats-view' });

		const template = {

			hp: Lang.text('health'),
			mp: Lang.text('energy'),
			speed: Lang.text('speed'),
			sila: Lang.text('strength'),
			razum: Lang.text('intelligence'),
			provorstvo: Lang.text('agility'),
			hitrost: Lang.text('dexterity'),
			stoikost: Lang.text('stamina'),
			volia: Lang.text('will'),
			damage: Lang.text('damage'),
			critProb: Lang.text('criticalHit'),
			attackSpeed: Lang.text('attacksPerSecond'),
			punching: Lang.text('penetration'),
			protectionBody: Lang.text('defencePsys'),
			protectionSpirit: Lang.text('defenceMagic'),
		};

		if (!('profile' in Build.dataRequest)) {

			Build.dataRequest.profile = [0, 0, 0, 0, 0, 0, 0, 0, 0];

		}

		let i = 0;

		const cond = key =>
			['damage', 'critProb', 'attackSpeed', 'punching', 'protectionBody', 'protectionSpirit', 'considerStacks', 'considerBuff', 'groundType'].includes(key);

		for (const key in template) {

			const item = DOM({
				style: 'build-hero-stats-item', event: ['click', !cond(key) ? () => {

					if (item.dataset.active == 1) {

						item.style.background = 'rgba(0,0,0,0)';

						if (key == 'hp') {
							Build.removeSortInventory('stats', 'hp');
							Build.removeSortInventory('stats', 'krajahp');
							Build.removeSortInventory('stats', 'krajahprz');
							Build.removeSortInventory('stats', 'regenhpvz');
							Build.removeSortInventory('stats', 'krajahpvz');
							Build.removeSortInventory('stats', 'regenhp');
							Build.removeSortInventory('stats', 'hpmp');
						}
						else if (key == 'mp') {
							Build.removeSortInventory('stats', 'mp');
							Build.removeSortInventory('stats', 'regenmp');
							Build.removeSortInventory('stats', 'krajamp');
							Build.removeSortInventory('stats', 'regenmpvz');
							Build.removeSortInventory('stats', 'hpmp');
						}
						else if (key == 'speed') {
							Build.removeSortInventory('stats', 'speed');
							Build.removeSortInventory('stats', 'speedrz');
							Build.removeSortInventory('stats', 'speedvz');
						}
						else if (key == 'sila') {
							Build.removeSortInventory('stats', 'sila');
							Build.removeSortInventory('stats', 'sr');
							Build.removeSortInventory('stats', 'srsv');
							Build.removeSortInventory('stats', 'silarz');
							Build.removeSortInventory('stats', 'silavz');
						}
						else if (key == 'razum') {
							Build.removeSortInventory('stats', 'razum');
							Build.removeSortInventory('stats', 'sr');
							Build.removeSortInventory('stats', 'srsv');
							Build.removeSortInventory('stats', 'razumrz');
							Build.removeSortInventory('stats', 'razumvz');
						}
						else if (key == 'provorstvo') {
							Build.removeSortInventory('stats', 'provorstvo');
							Build.removeSortInventory('stats', 'ph');
							Build.removeSortInventory('stats', 'provorstvorz');
							Build.removeSortInventory('stats', 'provorstvovz');

						}
						else if (key == 'hitrost') {
							Build.removeSortInventory('stats', 'hitrost');
							Build.removeSortInventory('stats', 'ph');
							Build.removeSortInventory('stats', 'hitrostrz');
							Build.removeSortInventory('stats', 'hitrostvz');

						}
						else if (key == 'stoikost') {
							Build.removeSortInventory('stats', 'stoikost');
							Build.removeSortInventory('stats', 'sv');
							Build.removeSortInventory('stats', 'srsv');
							Build.removeSortInventory('stats', 'stoikostrz');
							Build.removeSortInventory('stats', 'svvz');
							Build.removeSortInventory('stats', 'vs');
						}
						else if (key == 'volia') {
							Build.removeSortInventory('stats', 'volia');
							Build.removeSortInventory('stats', 'sv');
							Build.removeSortInventory('stats', 'srsv');
							Build.removeSortInventory('stats', 'voliarz');
							Build.removeSortInventory('stats', 'svvz');
							Build.removeSortInventory('stats', 'vs');
						}
						Build.sortInventory();
						item.dataset.active = 0;
					} else {
						item.style.background = '#5899';
						if (key == 'hp') {
							Build.setSortInventory('stats', 'hp');
							Build.setSortInventory('stats', 'krajahp');
							Build.setSortInventory('stats', 'krajahprz');
							Build.setSortInventory('stats', 'regenhpvz');
							Build.setSortInventory('stats', 'krajahpvz');
							Build.setSortInventory('stats', 'regenhp');
							Build.setSortInventory('stats', 'hpmp');
						}
						else if (key == 'mp') {
							Build.setSortInventory('stats', 'mp');
							Build.setSortInventory('stats', 'regenmp');
							Build.setSortInventory('stats', 'krajamp');
							Build.setSortInventory('stats', 'regenmpvz');
							Build.setSortInventory('stats', 'hpmp');
						}
						else if (key == 'speed') {
							Build.setSortInventory('stats', 'speed');
							Build.setSortInventory('stats', 'speedrz');
							Build.setSortInventory('stats', 'speedvz');
						}
						else if (key == 'sila') {
							Build.setSortInventory('stats', 'sila');
							Build.setSortInventory('stats', 'sr');
							Build.setSortInventory('stats', 'srsv');
							Build.setSortInventory('stats', 'silarz');
							Build.setSortInventory('stats', 'silavz');
						}
						else if (key == 'razum') {
							Build.setSortInventory('stats', 'razum');
							Build.setSortInventory('stats', 'sr');
							Build.setSortInventory('stats', 'srsv');
							Build.setSortInventory('stats', 'razumrz');
							Build.setSortInventory('stats', 'razumvz');
						}
						else if (key == 'provorstvo') {
							Build.setSortInventory('stats', 'provorstvo');
							Build.setSortInventory('stats', 'ph');
							Build.setSortInventory('stats', 'provorstvorz');
							Build.setSortInventory('stats', 'provorstvovz');
						}
						else if (key == 'hitrost') {
							Build.setSortInventory('stats', 'hitrost');
							Build.setSortInventory('stats', 'ph');
							Build.setSortInventory('stats', 'hitrostrz');
							Build.setSortInventory('stats', 'hitrostvz');
						}
						else if (key == 'stoikost') {
							Build.setSortInventory('stats', 'stoikost');
							Build.setSortInventory('stats', 'sv');
							Build.setSortInventory('stats', 'srsv');
							Build.setSortInventory('stats', 'stoikostrz');
							Build.setSortInventory('stats', 'svvz');
							Build.setSortInventory('stats', 'vs');
						}
						else if (key == 'volia') {
							Build.setSortInventory('stats', 'volia');
							Build.setSortInventory('stats', 'sv');
							Build.setSortInventory('stats', 'srsv');
							Build.setSortInventory('stats', 'voliarz');
							Build.setSortInventory('stats', 'svvz');
							Build.setSortInventory('stats', 'vs');
						}else if (key == 'hpmp') {
							Build.setSortInventory('stats', 'hpmp');
						} else {
							Build.setSortInventory('stats', key);
						}
						// Build.setSortInventory('stats','hp');

						Build.sortInventory();
						item.dataset.active = 1;

					}

				} : null]
			},
				DOM({ tag: 'div' }, template[key]),
				DOM({ tag: 'div' }, data.stats[key] || 0)
			);

			if (key === 'groundType') {
				let isMouseOverItem = false;
				let isMouseOverWrapper = false;
				item.classList.add('noNumber');
				if (Build.applyRz || Build.applyVz) {
					item.classList.add('highlight');
				}
				let mouseOutEvent = function () {
					if (isMouseOverWrapper || isMouseOverItem) {
						return;
					}
					let wrapper = item.parentNode.querySelector('.wrapper');
					if (wrapper) {
						wrapper.remove();
					}
				}
				item.onclick = _ => {
					item.classList.toggle('highlight');
					let wrapper = item.parentNode.querySelector('.wrapper');
					if (Build.applyRz || Build.applyVz) {
						// Disable
						Build.applyRz = false;
						Build.applyVz = false;
						if (wrapper) {
							if (wrapper.querySelector('.home.highlight')) {
							}
							wrapper.querySelector('.home').classList.remove('highlight');
							if (wrapper.querySelector('.enemy.highlight')) {
							}
							wrapper.querySelector('.enemy').classList.remove('highlight');
						}
					} else {
						// Enable home
						Build.applyRz = true;
						Build.applyVz = false;
						if (wrapper) {
							wrapper.querySelector('.home').classList.add('highlight');
							if (wrapper.querySelector('.enemy.highlight')) {
								wrapper.querySelector('.enemy.highlight').classList.remove('highlight');
							}
						}
					}
					Build.updateHeroStats();
				}
				item.onmouseover = _ => {
					isMouseOverItem = true;
					if (item.parentNode.querySelector('.wrapper')) {
						// Node already here
						return;
					}
					const home = DOM({ style: 'home' }, 'Родная');
					const enemy = DOM({ style: 'enemy' }, 'Вражеская');
					if (Build.applyRz) {
						home.classList.add('highlight');
					} else if (Build.applyVz) {
						enemy.classList.add('highlight');
					}
					home.onclick = _ => {
						// Remove applicator if already selected
						if (home.classList.contains('highlight')) {
							home.classList.remove('highlight');
							item.classList.remove('highlight');
							Build.applyRz = false;
						} else {
							if (!item.classList.contains('.build-hero-stats-item.highlight')) {
								item.classList.add('highlight');
							}
							home.classList.add('highlight');
							enemy.classList.remove('highlight');
							Build.applyRz = true;
							Build.applyVz = false;
						}
						Build.updateHeroStats();
					}
					enemy.onclick = _ => {
						// Remove applicator if already selected
						if (enemy.classList.contains('highlight')) {
							enemy.classList.remove('highlight');
							item.classList.remove('highlight');
							Build.applyVz = false;
						} else {
							if (!item.classList.contains('.build-hero-stats-item.highlight')) {
								item.classList.add('highlight');
							}
							enemy.classList.add('highlight');
							home.classList.remove('highlight');
							Build.applyVz = true;
							Build.applyRz = false;
						}
						Build.updateHeroStats();
					}
					const wrapper = DOM({ style: 'wrapper' }, home, enemy);
					wrapper.onmouseover = _ => {
						isMouseOverWrapper = true;
					}
					wrapper.onmouseout = _ => {
						isMouseOverWrapper = false;
						setTimeout(_ => {
							mouseOutEvent();
						}, 100)
					}
					item.parentNode.append(wrapper)

				}
				item.onmouseout = _ => {
					isMouseOverItem = false;
					setTimeout(_ => {
						mouseOutEvent();
					}, 100)
				}
			}

			if (key === 'considerStacks') {
				item.title = `Учитывание талантов, которые дают постепенную прибавку к определенному параметру Ваших характеристик
(например таланты оранжевого качества "Убийственная логика", Неудержимая сила")`
			}
			if (key === 'considerBuff') {
				item.title = `Учитывание талантов, которые действуют "на всех союзников/врагов" кратковременно или постоянно, активно или пассивно
(например таланты красного качества "Гимн решительности", Воодушевляющий гимн")`
			}
			if (key === 'groundType') {
				item.title = `Учитывание талантов, которые дают дополнительный баф от типа территории (земли) - родная, вражеская/нейтральная 
(например таланты красного качества "Оберег жизни", "Сияние естества")`
			}

			if (key === 'considerStacks' || key === 'considerBuff') {
				item.classList.add('noNumber');
				if (Build.applyStak && key === 'considerStacks') {
					item.classList.add('highlight');
				}
				if (Build.applyBuffs && key === 'considerBuff') {
					item.classList.add('highlight');
				}
				item.onclick = _ => {
					item.classList.toggle('highlight');
					if (key == 'considerStacks') {
						Build.applyStak = !Build.applyStak;
					} else if (key == 'considerBuff') {
						Build.applyBuffs = !Build.applyBuffs;
					}
					Build.updateHeroStats();
				}
			}

			item.dataset.active = 0;
			if (cond(key)) {
				item.classList.add('passive');
			}

			Build.dataStats[key] = item;

			if (!['hp', 'mp', 'speed', 'damage', 'critProb', 'attackSpeed', 'punching', 'protectionBody', 'protectionSpirit', 'considerStacks', 'considerBuff', 'groundType'].includes(key)) {
				const daw = DOM({
					tag: 'img', style: 'build-hero-stats-daw', title: 'Сделать характеристику приоритетной', event: ['click', async () => {

						if (daw.dataset.status != 0) {

							await App.api.request('build', 'setProfile', { id: Build.id, index: daw.dataset.index, value: false });

							daw.dataset.status = 0;
							daw.src = 'content/icons/circle.webp';

							Build.profileStats[key] = 0;

							Build.updateHeroStats();
						}
						else {

							await App.api.request('build', 'setProfile', { id: Build.id, index: daw.dataset.index, value: true });

							daw.dataset.status = 1;
							daw.src = 'content/icons/checkbox.webp';

							Build.profileStats[key] = 1;

							Build.updateHeroStats();
						}
					}]
				});

				daw.dataset.index = i;

				daw.dataset.status = Build.dataRequest.profile[i];

				Build.profileStats[key] = parseInt(daw.dataset.status);

				if (daw.dataset.status == 1) {
					daw.src = 'content/icons/checkbox.webp';
				} else {
					daw.src = 'content/icons/circle.webp';
				}

				stats.append(DOM({ style: 'build-hero-stats-line' }, daw, item));
			} else {
				stats.append(DOM({ style: 'build-hero-stats-line' }, item));
			}
			i++;

		}

		let landTypeSetting = DOM({
			style: ['build-hero-stats-setting-land-type', 'button-outline', 'build-hero-stats-setting-land-type-rz'],
			title: Lang.text('titleLandTipeRZ'),
			event: ['click', async () => {
				Build.applyRz = !Build.applyRz;
				Build.applyVz = !Build.applyVz;
				Build.updateHeroStats();
				if (Build.applyRz) {
					landTypeSetting.classList.replace('build-hero-stats-setting-land-type-vz', 'build-hero-stats-setting-land-type-rz');
					landTypeSetting.title = Lang.text('titleLandTipeRZ');
				} else {
					landTypeSetting.classList.replace('build-hero-stats-setting-land-type-rz', 'build-hero-stats-setting-land-type-vz');
					landTypeSetting.title = Lang.text('titleLandTipeVZ');
				}
			}]
		});

		stats.append(DOM({ style: 'build-hero-stats-settings' }, landTypeSetting));

		Build.heroName = DOM({ tag: 'div', style: 'name' });

		if (MM.hero) {
			const hero = MM.hero.find(h => h.id === data.id);
			Build.heroName.innerText = Lang.heroName(hero.id, hero.skin || 1);
		}

		Build.heroImg = DOM({ style: 'avatar' });

		if (App.isAdmin()) {

			Build.heroImg.onclick = async () => {

				let body = document.createDocumentFragment(), request = await App.api.request('build', 'heroData', { id: data.id });

				for (let key in request) {

					body.append(App.input((value) => {

						let object = new Object();

						object[key] = value;

						App.api.request('build', 'heroEdit', { id: data.id, object: object });

					}, { value: request[key] }));

				}

				body.append(DOM({ style: 'splash-content-button', event: ['click', () => Splash.hide()] }, Lang.text('titleClose')));

				Splash.show(body);

			}

		}

		Build.heroImg.style.backgroundImage = `url(content/hero/${data.id}/${Build.dataRequest.hero.skin.target ? Build.dataRequest.hero.skin.target : 1}.webp)`;

		let rankIcon = DOM({ style: 'rank-icon' });

		rankIcon.style.backgroundImage = `url(content/ranks/${Rank.icon(data.rating)}.webp)`;

		let rank = DOM({ style: 'rank' }, DOM({ style: 'rank-lvl' }, data.rating), rankIcon);

		Build.heroImg.append(rank);
		// Build.training
		const wrapper = DOM({ style: 'build-hero-avatar-and-name' }, Build.heroImg, Build.skinView, Build.training);

		Build.heroView.append(
			wrapper,
			stats
		);

	}

	static updateHeroStats() {
		Build.heroPower = 0.0;
		for (let key in Build.calculationStats) {
			Build.calculationStats[key] = 0.0;
		}

		for (let i = 35; i >= 0; i--) {
			let talent = Build.installedTalents[i];
			if (talent) {
				Build.calcStatsFromPower(i);
				Build.setStat(talent, true, false);
			}
		}

		for (let key2 in Build.dataStats) {

			Build.dataStats[key2].lastChild.innerText = Math.round(Build.totalStat(key2));

		}

		const statAg = Build.totalStat('provorstvo')
		const statCun = Build.totalStat('hitrost')
		const statStamina = Build.totalStat('stoikost');
		const statWill = Build.totalStat('volia');
		const statStrength = Build.totalStat('sila');
		const statInt = Build.totalStat('razum');

		{
			// TODO: make hero damage calculation
			let damage = Build.heroMainAttackStat == 1 ? statStrength : statInt;
			let dmgMin = Math.round(damage * Build.heroAttackModifier * 0.9);
			let dmgMax = Math.round(damage * Build.heroAttackModifier * 1.1);
			let dmgTag = Build.heroMainAttackStat == 1 ? '<fiz> </fiz>' : '<mag> </mag>';
			Build.dataStats['damage'].lastChild.innerHTML = dmgMin + '-' + dmgMax + dmgTag;
		}

		{
			let penetration = 0.0;
			if (statAg > 500.0) {
				penetration += 61.72 + 0.6876 * statAg - 10.035 * Math.sqrt(statAg);
			} else {
				penetration += 48.45 + 0.764 * statAg - 11.15 * Math.sqrt(statAg);
			}
			if (statCun > 500.0) {
				penetration += 85.78 + 0.43 * statCun - 15.55 * Math.log(statCun);
			} else {
				penetration += 59.83 + 0.57 * statCun - 20.73 * Math.log(statCun);
			}
			Build.dataStats['punching'].lastChild.innerText = Math.round(penetration) + '%';;
		}

		{
			let defStamina = 0.5355 * (statStamina + 0.3 * statWill) - 20;
			let defWill = 0.5355 * (statWill + 0.3 * statStamina) - 20;

			Build.dataStats['protectionBody'].lastChild.innerText = Math.round(defStamina) + '%';;
			Build.dataStats['protectionSpirit'].lastChild.innerText = Math.round(defWill) + '%';;
		}

		{
			let crit = 62.765 - 11534.0 / (126.04 + statCun);
			Build.dataStats['critProb'].lastChild.innerText = Math.max(0.0, Math.round(crit)) + '%';
		}

		{
			let attackSpeed = Math.min(2.0, 0.00364 * statAg + 0.49);
			Build.dataStats['attackSpeed'].lastChild.innerText = Math.round(attackSpeed * 100.0) / 100.0;
		}
	}

	static calcStatsFromPower(maxTalentId) {
		const talentPowerByLine = {
			5: (33.0 / 600.0),
			4: (23.0 / 600.0),
			3: (16.0 / 600.0),
			2: (13.0 / 600.0),
			1: (9.0 / 600.0),
			0: (6.0 / 600.0)
		}

		Build.heroPowerFromInstalledTalents = 0.0;

		for (let i = 35; i >= 0 && i >= maxTalentId; i--) {
			let talent = Build.installedTalents[i];
			if (talent) {
				let line = Math.floor((35 - i) / 6);
				Build.heroPowerFromInstalledTalents += talentPowerByLine[line];
			}
		}

		for (let stat in Build.heroStatsFromPower) {
			let Lvl = Build.heroStatMods[stat];
			let q = Build.heroPowerModifier;
			let m = Build.heroPower * Build.heroPowerFromInstalledTalents;
			Build.heroStatsFromPower[stat] = Lvl * (0.6 * q * (m / 10.0 - 16.0) + 36.0);
		}
	}

	static getMaxStat(stats) {
		const fakeStat = 999;
		let maxStat = stats[0];
		let maxValue = Build.totalStat(maxStat);
		if (maxStat in Build.profileStats) {
			maxValue += Build.profileStats[maxStat] * fakeStat;
		}

		for (let s = 1; s < stats.length; s++) {
			let possibleMaxStat = Build.totalStat(stats[s]);
			if (stats[s] in Build.profileStats) {
				possibleMaxStat += Build.profileStats[stats[s]] * fakeStat;
			}
			if (possibleMaxStat > maxValue) {
				maxStat = stats[s];
				maxValue = Build.totalStat(maxStat);
				if (maxStat in Build.profileStats) {
					maxValue += Build.profileStats[maxStat] * fakeStat;
				}
			}
		}

		return maxStat;
	}
	
	static getSumStat(stats){
		let sumStat = stats[0];
		return sumStat;
	}

	static getTalentRefineByRarity(rarity) {
		return rarity ? Build.talentRefineByRarity[rarity] - 1.0 : 4.0;
	}

	static setStat(talent, fold = true, animation = true) {

		// Calculate overall power bonus
		const talentPowerByRarity = {
			4: Build.talentPowerByRarityFirstLevel[4] + Build.talentPowerByRarityPerLevel[4]*(Build.talentRefineByRarity[4]-1),
			3: Build.talentPowerByRarityFirstLevel[3] + Build.talentPowerByRarityPerLevel[3]*(Build.talentRefineByRarity[3]-1),
			2: Build.talentPowerByRarityFirstLevel[2] + Build.talentPowerByRarityPerLevel[2]*(Build.talentRefineByRarity[2]-1),
			1: Build.talentPowerByRarityFirstLevel[1] + Build.talentPowerByRarityPerLevel[1]*(Build.talentRefineByRarity[1]-1),
			0: Build.talentPowerByRarityFirstLevel[0] + Build.talentPowerByRarityPerLevel[0]*(Build.talentRefineByRarity[4]-1)
		}

		let talentPower = 'rarity' in talent ? talentPowerByRarity[talent.rarity] : talentPowerByRarity[0];
		Build.heroPower += fold ? talentPower : -talentPower;

		let add = new Object();

		function registerStat(stat, key) {
			let statValue = parseFloat(talent.stats[key]);
			if ('statsRefine' in talent && 'rarity' in talent) {
				let refineBonus = Build.getTalentRefineByRarity(talent.rarity);
				let refineMul = parseFloat(talent.statsRefine[key]);
				statValue += refineBonus * refineMul;
			}
			add[stat] = statValue;
		}

		for (let key in talent.stats) {

			if (key == 'sr') {
				registerStat(Build.getMaxStat(['sila', 'razum']), key)
			}
			else if (key == 'ph') {
				registerStat(Build.getMaxStat(['provorstvo', 'hitrost']), key)
			}
			else if (key == 'sv') {
				registerStat(Build.getMaxStat(['stoikost', 'volia']), key)
			}
			else if (key == 'srsv') {
				registerStat(Build.getMaxStat(['sila', 'razum', 'stoikost', 'volia']), key)
			}
			else if (key == 'hpmp') {
				registerStat(Build.getMaxStat(['hp', 'mp']), key)
			}
			else {
				registerStat(key, key);
			}

		}

		function calcualteSpecialStats(keyStat, statChange) {
			if (keyStat in Build.calculationStats) {
				if (keyStat == 'speed') {
					Build.calculationStats[keyStat] = Math.max(Build.calculationStats[keyStat], statChange);
				} else {
					Build.calculationStats[keyStat] += fold ? statChange : -statChange;
				}
			}
		}

		// Apply animation and change stats in Build.calculationStats
		for (let key2 in add) {

			let statChange = parseFloat(add[key2]);
			if (Build.applyStak && key2.indexOf('stak') != -1) {
				calcualteSpecialStats(key2.replace('stak', ''), statChange);
			} else
				if (Build.applyRz && key2.indexOf('rz') != -1) {
					calcualteSpecialStats(key2.replace('rz', ''), statChange);
				} else
					if (Build.applyVz && key2.indexOf('vz') != -1) {
						calcualteSpecialStats(key2.replace('vz', ''), statChange);
					} else
						if (key2.indexOf('dop') != -1) {
							calcualteSpecialStats(key2.replace('dop', ''), statChange);
						} else
							if (Build.applyBuffs && key2.indexOf('buff') != -1) {
								calcualteSpecialStats(key2.replace('buff', ''), statChange);
							} else {
								calcualteSpecialStats(key2, statChange);
							}

			if (!(key2 in Build.dataStats)) {

				continue;

			}

			if (animation) {

				Build.dataStats[key2].animate({ transform: ['scale(1)', 'scale(1.5)', 'scale(1)'] }, { duration: 250, fill: 'both', easing: 'ease-out' });

				Build.heroImg.animate({ transform: ['scale(1)', 'scale(1.5)', 'scale(1)'] }, { duration: 250, fill: 'both', easing: 'ease-out' });

			}

		}

	}

	static level() {

		let i = 6;
		for (const number of ['VI', 'V', 'IV', 'III', 'II', 'I']) {

			const item = document.createElement('div');

			item.innerText = number

			item.dataset.id = i;

			item.dataset.active = 0;

			item.id = `bl${i}`

			item.addEventListener('click', e => {

				if (item.dataset.active == 1) {

					Build.removeSortInventory('level', item.dataset.id);

					Build.sortInventory();

					item.dataset.active = 0;

				} else {

					Build.setSortInventory('level', item.dataset.id);

					Build.sortInventory();

					item.dataset.active = 1;

				}

				e.target.classList.toggle('highlight');

				document.querySelector(`[data-level="${item.dataset['id']}"`).classList.toggle('highlight');

			});

			item.addEventListener('contextmenu', e => {
				e.preventDefault();

				for (const level of ["1", "2", "3", "4", "5", "6"]) {
					Build.removeSortInventory('level', level);
				}
				for (let l = 0; l < 6; l++) {
					item.parentElement.childNodes[l].dataset.active = 0;

					item.parentElement.childNodes[l].classList.remove('highlight');
					document.querySelector(`[data-level="${item.parentElement.childNodes[l].dataset['id']}"`).classList.remove('highlight');
				}
				Build.setSortInventory('level', item.dataset.id);

				Build.sortInventory();

				item.dataset.active = 1;

				document.querySelectorAll('.build-level div.highlight').forEach(n => n.click());
				item.classList.add('highlight');
				document.querySelector(`[data-level="${item.dataset['id']}"`).classList.add('highlight');
			});

			Build.levelView.append(item);

			i--;

		}

	}

	static talentStatFilter(stat) {
		return (
			stat.indexOf('stak') != -1 ||
			stat.indexOf('rz') != -1 ||
			stat.indexOf('vz') != -1 ||
			stat.indexOf('stak') != -1 ||
			stat.indexOf('dop') != -1 ||
			stat.indexOf('buff') != -1 ||
			(stat.indexOf('speed') != -1 && stat.indexOf('speedtal') == -1)
		);
	}

	static field(data) {
		/*

		*/
		let y = 0, index = 0, level = 6, preload = new PreloadImages();

		while (y < 6) {

			let row = document.createElement('div');

			row.classList.add('build-field-row');

			row.id = `bfr${level}`;

			row.dataset.level = level;

			let x = 0;

			while (x < 6) {

				let item = document.createElement('div');

				item.dataset.position = index;

				item.classList.add('build-hero-grid-item');

				if (data[index]) {

					data[index].state = 2;

					preload.add(Build.templateViewTalent(data[index]), item);

				}

				row.append(item);


				Build.installedTalents[index] = data[index];

				if (data[index] && 'conflict' in data[index]) {
					Build.fieldConflict[Math.abs(data[index].id)] = true;
				}

				x++;

				index++;

			}

			Build.fieldView.append(row);

			level--;

			y++;
		}

		Build.updateHeroStats();

	}

	static templateViewTalent(data) {

		const talent = DOM({ style: 'build-talent-item' });

		if (data.txtNum) {
			let params = data.txtNum.split(';');
			if (!data.stats) {
				data.stats = new Object();
			}
			if (!data.statsRefine) {
				data.statsRefine = new Object();
			}
			for (let param in params) {
				let paramValues = params[param].split(',');
				if (Build.talentStatFilter(paramValues[2])) {
					data.stats[paramValues[2]] = parseFloat(paramValues[0]);
					data.statsRefine[paramValues[2]] = parseFloat(paramValues[1]);
				} else if (!(paramValues[2] in data.stats) && (paramValues[2] in Build.initialStats) && (Build.initialStats[paramValues[2]] > 0)) {
					data.stats[paramValues[2] + 'buff'] = parseFloat(paramValues[0]);
					data.statsRefine[paramValues[2] + 'buff'] = parseFloat(paramValues[1]);
				}
			}
		}

		data.params = data.txtNum ? data.txtNum : data.params; //"all,8,74,num,razum";

		Build.talents[data.id] = data;

		talent.dataset.id = data.id;

		talent.dataset.active = data.active;

		talent.dataset.state = data.state;

		talent.dataset.url = (data.id > 0) ? `content/talents/${data.id}.webp` : `content/htalents/${Math.abs(data.id)}.webp`;

		Build.move(talent);

		Build.description(talent);

		if (data.level == 0) {
			talent.style.display = 'none';
		}

		return talent;

		preload.add(talent);
	}

	static inventory() {

		if (Build.loading) {
			return;
		}

		Build.loading = true;

		App.api.silent((data) => {

			for (let item of data) {

				let talentContainer = DOM({ style: 'build-talent-item-container' });

				Build.inventoryView.querySelector('.build-talents').append(talentContainer);

				let preload = new PreloadImages(talentContainer);

				item.state = 1;

				preload.add(Build.templateViewTalent(item));

			}

			Build.loading = false;

		}, 'build', 'inventory', { buildId: Build.id });

	}

	static rarity() {

		const element = [
			{ id: '4', name: 'Красное', color: '170,20,44' },
			{ id: '3', name: 'Оранжевое', color: '237,129,5' },
			{ id: '2', name: 'Фиолетовое', color: '205,0,205' },
			{ id: '1', name: 'Синее', color: '17,105,237' }
		];

		let a = document.createElement('div');
		a.title = Lang.text('titleActiveTalents');

		a.classList.add('build-rarity-other');

		a.innerText = 'А';

		a.dataset.active = 0;

		a.addEventListener('click', e => {

			if (a.dataset.active == 1) {

				a.style.background = 'rgba(255,255,255,0.1)';

				Build.removeSortInventory('active', '1');

				Build.sortInventory();

				a.dataset.active = 0;

			}
			else {

				a.style.background = 'rgba(153,255,51,0.7)';

				Build.setSortInventory('active', '1');

				Build.sortInventory();

				a.dataset.active = 1;

			}

		});

		a.addEventListener('contextmenu', e => {
			e.preventDefault();

			for (let itemEl of element) {
				Build.removeSortInventory('rarity', itemEl.id);
			}

			for (let l = 0; l < a.parentElement.childNodes.length; l++) {
				a.parentElement.childNodes[l].dataset.active = 0;
				a.parentElement.childNodes[l].style.border = 'none';
			}
			a.style.background = 'rgba(255,255,255,0.1)';

			Build.setSortInventory('active', '1');

			Build.sortInventory();

			a.dataset.active = 1;

			a.style.background = 'rgba(153,255,51,0.7)';
		});

		Build.rarityView.append(a);

		for (let item of element) {

			let button = document.createElement('div');

			button.dataset.active = 0;

			button.style.boxSizing = 'border-box';

			button.addEventListener('click', e => {

				if (button.dataset.active == 1) {

					button.style.border = 'none';

					Build.removeSortInventory('rarity', item.id);

					Build.sortInventory();

					button.dataset.active = 0;

				}
				else {

					button.style.border = 'solid calc(min(0.5cqh, 1cqw)) rgb(153,255,51)';

					Build.setSortInventory('rarity', item.id);

					Build.sortInventory();

					button.dataset.active = 1;

				}

			});


			button.addEventListener('contextmenu', e => {
				e.preventDefault();

				for (let itemEl of element) {
					Build.removeSortInventory('rarity', itemEl.id);
				}
				Build.removeSortInventory('active', '1');

				for (let l = 0; l < button.parentElement.childNodes.length; l++) {
					button.parentElement.childNodes[l].dataset.active = 0;
					button.parentElement.childNodes[l].style.border = 'none';
				}
				a.style.background = 'rgba(255,255,255,0.1)';

				Build.setSortInventory('rarity', item.id);

				Build.sortInventory();

				button.dataset.active = 1;

				button.style.border = 'solid calc(min(0.5cqh, 1cqw)) rgb(153,255,51)';
			});

			button.style.background = `rgba(${item.color},0.6)`;

			button.title = `${item.name} качество талантов`;

			Build.rarityView.append(button);

		}

	}

	static async removeTalentFromActive(activeId) {
		let container = Build.activeBarView.childNodes[activeId];

		Build.disableSmartCast(container);
		container.firstChild.remove();

		Build.activeBarItems[activeId] = 0;
		await App.api.request('build', 'setZeroActive', { buildId: Build.id, index: activeId });
	}

	static async requestSmartcast(element) {
		if (element.firstChild) {
			let position = Number(element.firstChild.dataset.position) + 1;
			if (element.dataset.active == 1) {
				position = -position;
			}

			await App.api.request('build', 'setActive', { buildId: Build.id, index: element.dataset.index, position: position });
		}
	}

	static async enableSmartCast(element, sendRequest) {
		element.classList.add('smartcast');
		element.dataset.active = 1;
		element.title = Lang.text('titleSmartcastIsEnabled');
		if (sendRequest) {
			await Build.requestSmartcast(element);
		}
	}

	static async disableSmartCast(element, sendRequest) {
		element.classList.remove('smartcast');
		element.dataset.active = 0;
		element.title = Lang.text('titleSmartcastIsDisabled');
		if (sendRequest) {
			await Build.requestSmartcast(element);
		}
	}

	static activeBar(data) {

		Build.activeBarItems = data;

		console.log('activeBar', data)
		let index = 0;

		for (let item of data) {

			const element = DOM({
				data: { index: index }, style: 'build-active-bar-item', event: ['contextmenu', async (e) => {
					e.preventDefault();
					if (!element.firstChild) {
						return;
					}

					if (element.dataset.active == 1) {
						await Build.disableSmartCast(element, true);
					}
					else {
						await Build.enableSmartCast(element, true);
					}

				}]
			});

			if (item >= 0) {

				element.dataset.active = 0;

			}
			else {

				Build.enableSmartCast(element);

			}

			if (Math.abs(item)) {

				let position = (Math.abs(item) - 1);

				let findTalent = Build.fieldView.querySelector(`[data-position = "${position}"]`);

				if ((findTalent) && (findTalent.firstChild)) {

					let clone = findTalent.firstChild.cloneNode(true);

					element.append(clone);

					clone.dataset.state = 3;

					clone.style.opacity = 1;

					clone.style.position = 'static';

					clone.style.backgroundImage = `url("${clone.dataset.url}")`;

					clone.dataset.position = position;

					Build.move(clone, true);


				}



			}

			Build.activeBarView.append(element);

			index++;

		}

	}

	static setSortInventory(key, value) {

		if (!(key in Build.ruleSortInventory)) {

			Build.ruleSortInventory[key] = new Array();

			Build.ruleSortInventory[key].push(value);

		}
		else {

			if (!Build.ruleSortInventory[key].includes(value)) {

				Build.ruleSortInventory[key].push(value);

			}

		}

		// Build.sortInventory();

	}

	static removeSortInventory(key, value) {

		if (key in Build.ruleSortInventory) {

			let newArray = new Array();

			for (let item of Build.ruleSortInventory[key]) {

				if (item != value) {

					newArray.push(item);

				}

			}

			if (newArray.length) {

				Build.ruleSortInventory[key] = newArray;

			}
			else {

				delete Build.ruleSortInventory[key];

			}

			// Build.sortInventory();

		}

	}

	static applySorting(itemContainer) {

		let item = itemContainer.firstChild;

		let data = Build.talents[item.dataset.id], flag = true;

		if (data.level == 0) {
			itemContainer.style.display = 'none';
			return;
		}

		for (let key in Build.ruleSortInventory) {

			if (!(key in data)) {

				flag = false;

				break;

			}

			if (key == 'stats') {

				let foundStat = false;

				if (!data.stats) {

					flag = false;

					break;

				}

				for (let stat of Build.ruleSortInventory.stats) {

					if ((stat in data.stats)) {

						foundStat = true;

					}

				}

				if (!foundStat) {

					flag = false;

					break;

				}

			}
			else {

				if (!Build.ruleSortInventory[key].includes(`${data[key]}`)) {

					flag = false;

					break;

				}

			}

		}

		if (flag) {

			itemContainer.style.display = 'block';

		}
		else {

			itemContainer.style.display = 'none';

		}
	}

	static sortInventory() {

		for (let itemContainer of Build.inventoryView.querySelectorAll('.build-talent-item-container')) {
			Build.applySorting(itemContainer);
		}

	}

	static cancelSortInventory() {

		Build.ruleSortInventory = new Object();

		for (let item of Build.inventoryView.children) {

			item.style.display = 'block';

		}

	}

	static move(element, fromActiveBar) {
    let elementFromPoint = (x, y) => {
        let elems = document.elementsFromPoint(x, y);
        return elems[0].className == 'build-level' ? elems[1] : elems[0];
    };

    let elementSetDisplay = (element, display) => {
        if (element.parentElement.classList == 'build-talent-item-container') {
            element.parentElement.style.display = display;
        }
        element.style.display = display;
    };

    element.onmousedown = (event) => {
        if (event.button != 0) return;

        let moveStart = Date.now();
        Build.descriptionView.style.display = 'none';

        let data = Build.talents[element.dataset.id];
        let fieldRow = document.getElementById(`bfr${data.level}`);

        if (!fromActiveBar) {
            fieldRow.style.background = 'rgba(255,255,255,0.5)';
            fieldRow.style.borderRadius = '1cqh';
        }

        // Фикс для transform
        element.style.transformOrigin = 'center center';
        element.style.willChange = 'transform';
        element.style.setProperty('transform', 'scale(1.1)', 'important');
        element.style.transition = 'transform 0.1s ease';

        let rect = element.getBoundingClientRect();
        let shiftX = event.pageX - rect.left-5;
        let shiftY = event.pageY - rect.top-5;

        let offsetParent = element;
        do {
            shiftX += offsetParent.offsetParent.offsetLeft;
            shiftY += offsetParent.offsetParent.offsetTop;
            offsetParent = offsetParent.offsetParent;
        } while (!(offsetParent.id == 'wbuild' || offsetParent.id == 'viewbuild'));

        element.style.zIndex = '9999';
        element.style.position = 'absolute';
        element.style.left = event.pageX - shiftX - 1 + 'px';
        element.style.top = event.pageY - shiftY - 1 + 'px';

        elementSetDisplay(element, 'none');
        let startingElementBelow = elementFromPoint(event.clientX, event.clientY);
        elementSetDisplay(element, 'block');

        document.onmousemove = (e) => {
            element.style.left = e.pageX - shiftX - 1 + 'px';
            element.style.top = e.pageY - shiftY - 1 + 'px';
        };

        element.onmouseup = async (event) => {
            // Возвращаем исходный размер
            element.style.setProperty('transform', 'scale(1)', 'important');

            let moveEnd = Date.now();
            let isClick = moveEnd - moveStart < 200;

            document.onmousemove = null;
            element.onmouseup = null;

            let field = Build.fieldView.getBoundingClientRect();
            let inventory = Build.inventoryView.getBoundingClientRect();
            let bar = Build.activeBarView.getBoundingClientRect();
            let target = element.getBoundingClientRect();

            let left = parseInt(element.style.left) + target.width / 2;
            let top = parseInt(element.style.top) + target.height / 2;

            let offsetParent = element;
            do {
                left += offsetParent.offsetParent.offsetLeft;
                top += offsetParent.offsetParent.offsetTop;
                offsetParent = offsetParent.offsetParent;
            } while (!(offsetParent.id == 'wbuild' || offsetParent.id == 'viewbuild'));

            let isFieldTarget = left > field.x && left < field.x + field.width && top > field.y && top < field.y + field.height;
            let isInventoryTarget = left > inventory.x && left < inventory.x + inventory.width && top > inventory.y && top < inventory.y + inventory.height;
            let isActiveBarTarget = left > bar.x && left < bar.x + bar.width && top > bar.y && top < bar.y + bar.height;

            if (isClick && (isFieldTarget || (isActiveBarTarget && fromActiveBar))) {
                elementSetDisplay(element, 'none');
                let elemBelow = elementFromPoint(event.clientX, event.clientY);
                elementSetDisplay(element, 'block');
                isClick = elemBelow == startingElementBelow;
            }
				if (isClick) {
					if (element.dataset.state == 2) {
						isFieldTarget = false;
						isInventoryTarget = true;
						isActiveBarTarget = false;
					}
					else if (element.dataset.state == 1 && data.level > 0) {
						let hasEmptySpace = false;
						for (let t = (data.level - 1) * 6; t < data.level * 6; t++) {
							if (!Build.installedTalents[35 - t]) {
								hasEmptySpace = true;
								break;
							}
						}
						if (hasEmptySpace) {
							isFieldTarget = true;
							isInventoryTarget = false;
							isActiveBarTarget = false;
						}
					}
				}

				let removeFromActive = async (position, skipActiveId) => {
					for (let i = 0; i < Build.activeBarItems.length; i++) {
						const talPos = Math.abs(Build.activeBarItems[i]) - 1;
						if (talPos == position && i != skipActiveId) {
							await Build.removeTalentFromActive(i);
						}
					}
				}

				let addToActive = async (index, position, datasetPosition, targetElem, clone, smartCast) => {
					await App.api.request('build', 'setActive', { buildId: Build.id, index: index, position: position });
					Build.activeBarItems[index] = position;
					targetElem.append(clone);
					clone.style.position = 'static';
					clone.style.zIndex = 1;

					clone.dataset.position = datasetPosition;
					clone.dataset.state = 3;
					clone.style.opacity = 1;
					clone.style.zIndex = 1;
					clone.style.position = 'static';


					Build.move(clone, true);
					if (smartCast) {
						await Build.enableSmartCast(targetElem, true);
					}
				}

				let editActive = async (position, newPosition, clone, skipActiveId) => {
					if (position == newPosition) {
						clone.remove();
						return null;
					}

					let activeBarPosition = -1;
					for (let i = 0; i < Build.activeBarItems.length; i++) {
						const talPos = Math.abs(Build.activeBarItems[i]) - 1;
						if (talPos == position && i != skipActiveId) {
							activeBarPosition = i;
							break;
						}
					}
					if (activeBarPosition == -1) {
						clone.remove();
						return null;
					}

					let container = Build.activeBarView.childNodes[activeBarPosition];

					let isSmartCast = Number(container.dataset.active);

					let activePosition = Number(newPosition) + 1;

					let glone = container.firstChild.cloneNode(true);

					await removeFromActive(position, skipActiveId);

					await addToActive(activeBarPosition, activePosition, newPosition, container, clone, isSmartCast);

					return activeBarPosition;
				}

				if (isFieldTarget && !fromActiveBar) {

					elementSetDisplay(element, 'none');

					let elemBelow = elementFromPoint(event.clientX, event.clientY);

					if (elemBelow.childNodes[0] && elemBelow.childNodes[0].className == 'build-talent-item') {
						// Select 'build-talent-item' if selected its parent
						elemBelow = elemBelow.childNodes[0];
					}

					let swapParentNode = element.parentNode;
					let performSwap = false;
					let performSwapFromLibrary = false;

					if (elemBelow.className == 'build-talent-item' && elemBelow.parentElement.className == 'build-hero-grid-item') {
						elemBelow = elemBelow.parentElement;
						performSwap = swapParentNode.dataset.position ? true : false;
						performSwapFromLibrary = !performSwap;
					}

					if (isClick && data.level > 0) {
						let talentsInRow = document.getElementsByClassName('build-field-row')[6 - data.level].childNodes;
						for (let tal in talentsInRow) {
							if (talentsInRow[tal].childNodes.length == 0) {
								elemBelow = talentsInRow[tal];
								break;
							}
						}
					}

					elementSetDisplay(element, 'block');

					if (elemBelow && (elemBelow.className == 'build-hero-grid-item')) {

						if ((data.level) && (elemBelow.parentNode.dataset.level == data.level)) {

							let conflictState = false;

							if ('conflict' in data) {
								for (let item of data.conflict) {

									if (item in Build.fieldConflict) {

										conflictState = true;

									}

								}
							}

							if (!conflictState) {

								if ('conflict' in data) {
									Build.fieldConflict[Math.abs(data.id)] = true;
								}

								let prevState = element.dataset.state;
								element.dataset.state = 2;

								let swappingTal = null;
								let removeContainerAfterMove = false;
								if (performSwap) {
									swappingTal = Build.installedTalents[parseInt(swapParentNode.dataset.position)];
									let swappedTal = Build.installedTalents[parseInt(elemBelow.dataset.position)];
									Build.installedTalents[parseInt(elemBelow.dataset.position)] = swappingTal;
									Build.installedTalents[parseInt(swapParentNode.dataset.position)] = swappedTal;

									swapParentNode.append(elemBelow.firstChild);
									elemBelow.append(element);
								} else {
									if (performSwapFromLibrary) {
										swappingTal = Build.installedTalents[parseInt(elemBelow.dataset.position)];
									}
									Build.installedTalents[parseInt(elemBelow.dataset.position)] = data;
									Build.installedTalents[parseInt(swapParentNode.dataset.position)] = null;

									elemBelow.append(element);
									if (performSwapFromLibrary) {
										swapParentNode.prepend(elemBelow.firstChild);
									} else {
										if (swapParentNode.classList == 'build-talent-item-container') {
											removeContainerAfterMove = true;
										}
									}
								}

								try {
									let activeBarPosition = null;
									if (data.active && swapParentNode.dataset.position) {
										activeBarPosition = await editActive(swapParentNode.dataset.position, elemBelow.dataset.position, element.cloneNode(true));
									}
									if (performSwap) {
										let swappedTalent = Build.installedTalents[parseInt(swapParentNode.dataset.position)];

										if (swappedTalent.active) {
											await editActive(elemBelow.dataset.position, swapParentNode.dataset.position, swapParentNode.firstChild.cloneNode(true), activeBarPosition);
										}
										await App.api.request('build', 'setZero', { buildId: Build.id, index: swapParentNode.dataset.position });
										await App.api.request('build', 'set', { buildId: Build.id, talentId: swappedTalent.id, index: swapParentNode.dataset.position });

										Build.setStat(data, true, false);
									} else {
										if (performSwapFromLibrary) {
											if (swappingTal.active) {
												await removeFromActive(elemBelow.dataset.position);
											}
											swapParentNode.firstChild.dataset.state = 1;
											await App.api.request('build', 'setZero', { buildId: Build.id, index: elemBelow.dataset.position });
										}
										Build.setStat(data, true);
									}

									await App.api.request('build', 'set', { buildId: Build.id, talentId: data.id, index: elemBelow.dataset.position });

									if (data.active && prevState != element.dataset.state) {
										let index = -1;
										for (let i = 0; i < Build.activeBarItems.length; i++) {
											if (Build.activeBarItems[i] == 0) {
												index = i;
												break;
											}
										}
										if (index != -1) {
											let targetActiveContainer = Build.activeBarView.childNodes[index];
											await addToActive(index, Number(elemBelow.dataset.position) + 1, elemBelow.dataset.position, targetActiveContainer, element.cloneNode(true));
										}
									}



								} catch (e) {

									element.dataset.state = 1;

									Build.inventoryView.querySelector('build-talents').prepend(element);

									Build.installedTalents[parseInt(elemBelow.dataset.position)] = null;

								}

								if (removeContainerAfterMove) {
									swapParentNode.remove();
								}

							}

						}

					}

				}
				else if (isInventoryTarget && !fromActiveBar) {

					elementSetDisplay(element, 'none');

					let elemBelow = elementFromPoint(event.clientX, event.clientY);

					if (isClick) {
						elemBelow = document.getElementsByClassName('build-talents')[0].firstChild;
					}

					elementSetDisplay(element, 'block');

					let targetElement = elemBelow.parentNode;

					if (targetElement.className == 'build-talent-item-container') {
						targetElement = targetElement.parentNode;
					}

					if (elemBelow && (targetElement.className == 'build-talents') && (element.dataset.state != 1)) {

						let oldParentNode = element.parentNode;

						element.dataset.state = 1;

						let containedTalent = DOM({ style: 'build-talent-item-container' }, element);

						Build.applySorting(containedTalent);

						targetElement.prepend(containedTalent);


						try {
							if (data.active && oldParentNode.dataset.position) {
								await removeFromActive(oldParentNode.dataset.position);
							}

							await App.api.request('build', 'setZero', { buildId: Build.id, index: oldParentNode.dataset.position });

							Build.installedTalents[parseInt(oldParentNode.dataset.position)] = null;

							Build.setStat(data, true);

							if (data.id < 0) {

								delete Build.fieldConflict[Math.abs(data.id)];

							}

						}
						catch (e) {

							element.dataset.state = 2;

							oldParentNode.append(element);

							elementSetDisplay(element, 'block');

							containedTalent.remove();

						}

					}

				}
				else if (isActiveBarTarget) {

					elementSetDisplay(element, 'none');

					let elemBelow = elementFromPoint(event.clientX, event.clientY);

					let isSwap = elemBelow.parentNode.classList.contains('build-active-bar-item');

					elementSetDisplay(element, 'block');

					if (
						(elemBelow) &&
						(element.dataset.state == 2 || element.dataset.state == 3) &&
						(elemBelow.classList.contains('build-active-bar-item') || isSwap) &&
						(data.active == 1)
					) {

						let index = elemBelow.dataset.index;
						let smartCast = Number(element.parentNode.dataset.active);
						let positionRaw = element.dataset.position;

						if (!positionRaw) {
							positionRaw = element.parentNode.dataset.position;
						}

						if (isSwap) {
							index = elemBelow.parentNode.dataset.index;
						}

						let position = Number(positionRaw) + 1;


						try {


							if (fromActiveBar) {
								let startingIndex = element.parentNode.dataset.index;
								if (isClick) {
									await removeFromActive(positionRaw);
								} else if (index != startingIndex) { // moved to other position
									let swapElemParent = element.parentNode;
									let targetElem = isSwap ? elemBelow.parentNode : elemBelow;
									let swapPositionRaw = isSwap ? elemBelow.dataset.position : 0;
									let swapPosition = Number(swapPositionRaw) + 1;
									let swapSmartCast = Number(targetElem.dataset.active);

									let clone = element.cloneNode(true);
									let swapClone = isSwap ? elemBelow.cloneNode(true) : null;
									await removeFromActive(positionRaw);
									if (swapClone) {
										await removeFromActive(swapPositionRaw);
									}

									await addToActive(index, position, positionRaw, targetElem, clone, smartCast);

									if (swapClone) {
										await addToActive(startingIndex, swapPosition, swapPositionRaw, swapElemParent, swapClone, swapSmartCast);
									}
								}
							} else {
								let targetElem = isSwap ? elemBelow.parentNode : elemBelow;
								let clone = element.cloneNode(true);
								clone.dataset.position = element.parentNode.dataset.position;
								clone.dataset.state = 3;
								clone.style.opacity = 1;
								clone.style.zIndex = 1;
								clone.style.position = 'static';

								if (isSwap) {
									await removeFromActive(elemBelow.dataset.position);
								}
								await removeFromActive(positionRaw);
								await App.api.request('build', 'setActive', { buildId: Build.id, index: index, position: position });
								Build.activeBarItems[index] = position;

								Build.move(clone, true);

								targetElem.append(clone);
							}

						}
						catch (e) {

							App.error('Failed to swap activebar')

						}

					}

				} else if (fromActiveBar) {
					await removeFromActive(element.dataset.position);
				}


				Build.updateHeroStats();

				fieldRow.style.background = '';

				element.style.position = 'static';

				element.style.zIndex = 'auto';

			}

		}

		element.ondragstart = () => {

			return false;

		};

	}

	static description(element) {
    let descEvent = () => {
        let positionElement = element.getBoundingClientRect();
        let data = Build.talents[element.dataset.id];

        if (!data) {
            console.log("Не найден талант в билде: " + element.dataset.id);
            Build.descriptionView.style.display = 'none';
            return;
        }

        // Определяем тип таланта и формируем ключи для перевода
        const isHeroTalent = data.id < 0;
        const prefix = isHeroTalent ? "htalent_" : "talent_";
        const absId = Math.abs(data.id);
        
        const nameKey = `${prefix}${absId}_name`;
        const descriptionKey = `${prefix}${absId}_description`;

        // Получаем переводы из системы Lang
        const name = Lang.text(nameKey);
        const description = Lang.text(descriptionKey);

        // Проверяем, есть ли переводы (если вернулся ключ, значит перевода нет)
        if (name === nameKey || description === descriptionKey) {
            Build.descriptionView.innerHTML = `<b>Талант #${data.id}</b><div>Информация отсутствует. Сообщите пожалуйста об этом в отдельную тему Telegram сообщества Prime World Classic.</div><span>+1000 Уважение</span>`;
            
            let positionDescription = Build.descriptionView.getBoundingClientRect();
            Build.descriptionView.style.zIndex = 9999;
            Build.descriptionView.style.position = 'fixed';
            Build.descriptionView.style.display = 'block';
            Build.descriptionView.style.left = (positionElement.left + positionElement.height) + 'px';
            Build.descriptionView.style.top = (positionElement.top) + 'px';
            return;
        }

        let rgb = '';
        switch (data.rarity) {
            case 1: rgb = '17,105,237'; break;
            case 2: rgb = '205,0,205'; break;
            case 3: rgb = '237,129,5'; break;
            case 4: rgb = '170,20,44'; break;
        }

        let stats = '';
        if (('stats' in data) && (data.stats)) {
            for (let key in data.stats) {
                if (Build.talentStatFilter(key)) {
                    continue;
                }

                let statValue = parseFloat(data.stats[key]);

                if ('statsRefine' in data && 'rarity' in data) {
                    let refineBonus = Build.getTalentRefineByRarity(data.rarity);
                    let refineMul = parseFloat(data.statsRefine[key]);
                    statValue += refineBonus * refineMul;
                }

                let sign = key == 'speedtal' || key == 'speedtalrz' || key == 'speedtalvz' ? '-' : '+';
                stats += sign + `${Math.floor(statValue * 10.0) / 10.0} ${Lang.text(key)}<br>`;
            }
        }
        
        let dataTemp = data.rarity; 
         
        switch (dataTemp) {
            case 1: dataTemp = 1; break;
            case 2: dataTemp = 2; break;
            case 3: dataTemp = 3; break;
            case 4: dataTemp = 4; break;
            default: dataTemp = 0; break; 
        }
        
        let talentIsClassBased = "";
        
        if(!dataTemp){
            talentIsClassBased = Lang.text('classTalent') + `<br>`;
        }
        
        let starOrange = window.innerHeight*0.015;
        let starGold = window.innerHeight*0.015;
        let talentRefineByRarity = Build.talentRefineByRarity[dataTemp==0?4:dataTemp];
        
        let stars = "";
        
        for(let i = 0; i < (talentRefineByRarity>15?0:talentRefineByRarity); i++){
            if(Math.floor(i/5)%2 == 1){
                stars = stars + `<img src="content/icons/starOrange27.webp" width=${starOrange} height=${starOrange}>`;
            }
            else{
                stars = stars + `<img src="content/icons/starGold.webp" width=${starGold} height=${starGold}>`;
            }
        } 
        
        if(talentRefineByRarity>15){
            stars = stars + talentRefineByRarity + `<img src="content/icons/starOrange27.webp" width=${starOrange} height=${starOrange}>`;
        }
        
        // Используем переведенное описание
        let descriptionWithStars = `<b>${talentIsClassBased}</b>${stars} <br><br> ${description} `;
        
        // Используем переведенное название
        Build.descriptionView.innerHTML = `<b style="color:rgb(${rgb})">${name}</b><div>${descriptionWithStars}</div><span>${stats}</span>`;

        let innerChilds = Build.descriptionView.childNodes[1].childNodes;
        let paramIterator = 0;
        for (let outerTag of innerChilds) {
            for (let specialTag of outerTag.childNodes) {
                let tagString = specialTag.innerHTML ? specialTag.innerHTML : specialTag.data;
                if (!tagString || tagString.indexOf('%s') == -1 || !data.params) {
                    continue;
                }
                let params = data.params.split(';');
                if (paramIterator >= params.length) {
                    continue;
                }
                let param = params[paramIterator];
                let paramValues = param.split(',');

                let statAffection, minValue, maxValue;

                if (paramValues.length == 5) {
                    minValue = parseFloat(paramValues[1]);
                    maxValue = parseFloat(paramValues[2]);
                    statAffection = paramValues[4];
                }
                else if (paramValues.length == 3) {
                    minValue = parseFloat(paramValues[0]);
                    maxValue = parseFloat(paramValues[1]);
                    statAffection = paramValues[2];
                }

                let resolvedStatAffection;
                let resolvedStatAffection1;
                let resolvedStatAffection2;
                switch (statAffection) {
                    case 'sr_max':
                        resolvedStatAffection = Build.getMaxStat(['sila', 'razum']);
                        break;
                    case 'sv_max':
                        resolvedStatAffection = Build.getMaxStat(['stoikost', 'volia']);
                        break;
                    case 'ph_max':
                        resolvedStatAffection = Build.getMaxStat(['provorstvo', 'hitrost']);
                        break;
                    case 'hpmp_max':
                        resolvedStatAffection = Build.getMaxStat(['hp', 'mp']);
                        break;
                    case 'sr_sum':    
                        resolvedStatAffection1 = 'sila';
                        resolvedStatAffection2 = 'razum';                        
                        break;
                    case 'ph_sum':    
                        resolvedStatAffection1 = 'provorstvo';
                        resolvedStatAffection2 = 'hitrost';                        
                        break;
                    case 'sv_sum':    
                        resolvedStatAffection1 = 'stoikost';
                        resolvedStatAffection2 = 'volia';                        
                        break;    
                    case 'hpmp_sum':    
                        resolvedStatAffection1 = 'hp';
                        resolvedStatAffection2 = 'mp';                        
                        break;    
                    default:
                        resolvedStatAffection = statAffection;
                        break;
                }

                function lerp(a, b, alpha) {
                    return a + alpha * (b - a);
                }
                
                let outputString;
                if (statAffection == 'sr_sum'||statAffection == 'ph_sum'||statAffection == 'sv_sum'||statAffection == 'hpmp_sum'){
                    let resolvedTotalStat1 = Build.totalStat(resolvedStatAffection1);
                    let resolvedTotalStat2 = Build.totalStat(resolvedStatAffection2);
                    const isHpOrEnergy = resolvedStatAffection1 == 'hp' || resolvedStatAffection1 == 'mp'|| resolvedStatAffection2 == 'hp' || resolvedStatAffection2 == 'mp';
                    const param1 = isHpOrEnergy ? 600.0 : 50.0;
                    const param2 = isHpOrEnergy ? 6250.0 : 250.0;
                    outputString = (lerp(minValue, maxValue, (resolvedTotalStat1 + resolvedTotalStat2 - param1) / param2)).toFixed(1);
                    if (outputString.endsWith(('.0'))) {
                        outputString = outputString.replace('.0', '');
                    }
                } else {
                    if (resolvedStatAffection in Build.dataStats && paramValues.length == 5) {
                        let resolvedTotalStat = Build.totalStat(resolvedStatAffection);
                        const isHpOrEnergy = resolvedStatAffection == 'hp' || resolvedStatAffection == 'mp';
                        const param1 = isHpOrEnergy ? 600.0 : 50.0;
                        const param2 = isHpOrEnergy ? 6250.0 : 250.0;
                        outputString = (lerp(minValue, maxValue, (resolvedTotalStat - param1) / param2)).toFixed(1);
                        if (outputString.endsWith(('.0'))) {
                            outputString = outputString.replace('.0', '');
                        }
                    } else {
                        let refineBonus = Build.getTalentRefineByRarity(data.rarity);
                        outputString = (minValue + maxValue * refineBonus).toFixed(1);
                        if (outputString.endsWith(('.0'))) {
                            outputString = outputString.replace('.0', '');
                        }
                    }
                }
                if (specialTag.innerHTML) {
                    specialTag.innerHTML = tagString.replace('%s', outputString);
                } else {
                    outerTag.innerHTML = tagString.replace('%s', outputString);
                }
                paramIterator++;
            }
        }

        let positionDescription = Build.descriptionView.getBoundingClientRect();
        Build.descriptionView.style.zIndex = 9999;
        Build.descriptionView.style.position = 'fixed';
        Build.descriptionView.style.display = 'block';
        
        let descriptionWidth = Build.descriptionView.offsetWidth;
        let ofSetW = 0,ofSetH = 0;
    
        if(Build.descriptionView.offsetHeight + positionElement.top > window.innerHeight){
            ofSetW = window.innerHeight - Build.descriptionView.offsetHeight - positionElement.top;
        }
    
        Build.descriptionView.style.left = (positionElement.left + positionElement.height) + 'px';
        Build.descriptionView.style.top = (positionElement.top + ofSetW) + 'px';
    }

    let descEventEnd = () => {
        Build.descriptionView.style.display = 'none';
    };
    
    element.ontouchstart = (e) => {
        descEvent();
    };

    element.onmouseover = () => { descEvent() };
    element.onmouseout = () => { descEventEnd() };
    element.ontouchend = () => {
        descEventEnd();
    };
}

}

class Events {

	static Message(data) {

		let body = document.createDocumentFragment();

		body.append(DOM(`${data.message}`))

		Splash.show(body);

		setTimeout(() => Splash.hide(), 3000);

	}

	static MMReady(data) {

		if (!NativeAPI.status) {

			return;

		}

		// NativeAPI.attention();

		MM.ready(data);

	}

	static MMReadyCount(data) {

		if (!NativeAPI.status) {

			return;

		}

		let find = document.getElementById('MMReady');

		if (find) {

			find.innerText = `${data.count}/${data.limit}`

		}

	}

	static MMStart(data) {

		if (!NativeAPI.status) {

			return;

		}

		// NativeAPI.attention();

		MM.lobby(data);

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

							item.style.backgroundImage = (findPlayer.dataset.hero != 0) ? `url(content/hero/${findPlayer.dataset.hero}/1.webp)` : `url(content/hero/empty.webp)`;

							item.style.transform = 'scale(1.5)';

						}

					}

				}

			}

		}

	}

	static MMHero(data) {

		if (!NativeAPI.status) {

			return;

		}

		MM.select(data);
		
	}

	static MMEnd(data) {

		if (!NativeAPI.status) {

			return;

		}

		MM.finish(data);

	}

	static PInvite(data) {

		let body = document.createDocumentFragment();

		let b1 = DOM({
			style: 'splash-content-button', event: ['click', async () => {

				await App.api.request(CURRENT_MM, 'joinParty', { code: data.code, version: PW_VERSION });

				Splash.hide();

			}]
		}, 'Принять');

		let b2 = DOM({ style: 'splash-content-button', event: ['click', () => Splash.hide()] }, 'Отмена');

		body.append(DOM(`${data.nickname} приглашает вас в лобби`), b1, b2)

		Splash.show(body);

	}

	static PUpdate(data) {

		View.show('castle', data);

	}

	static PHero(data) {

		let find = document.getElementById(`PP${data.id}`);

		if (find) {

			find.children[1].style.backgroundImage = (data.hero) ? `url(content/hero/${data.hero}/${data.skin ? data.skin : 1}.webp)` : `url(content/hero/empty.webp)`;

			find.children[1].firstChild.firstChild.innerText = data.rating;

			find.children[1].firstChild.firstChild.style.backgroundImage = `url(content/ranks/${Rank.icon(data.rating)}.webp)`;

		}

	}

	static PExit() {

		View.show('castle');

	}

	static PReady(data) {

		let find = document.getElementById(`PP${data.id}`);

		if (find) {

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

	static ADMStat(data) {

		document.getElementById('ADMStat').innerText = `${data.online}`;

	}

	static MMKick(data) {

		setTimeout(() => {

			MM.searchActive(false);

		}, 1000);

		let body = document.createDocumentFragment();

		let button = DOM({ style: 'splash-content-button', event: ['click', async () => Splash.hide()] }, 'Больше так не буду');

		body.append(DOM(`${data.party ? 'Один из участников пати был АФК, поэтому вы исключены из подбора матча' : 'Вы были исключены из матчмейкинга за АФК!'}`), button);

		Splash.show(body);

	}

	static UChat(data) {

		Chat.viewMessage(data);
		
	}
	
	static async VCall(data){
		
		if(data.isCaller){
			
			let body = document.createDocumentFragment();
			
			body.append(DOM(`Звонок от ${data.name}?`),DOM({style:'splash-content-button',event:['click', async () => {
				
				try{
					
					let voice = new Voice(data.id,'',data.name,true);
					
					await voice.accept(data.offer);
					
					Splash.hide();
					
				}
				catch(error){
					
					App.error(error);
					
				}
				
			}]},'Принять'),DOM({style:'splash-content-button',event:['click', async () => Splash.hide()] },'Сбросить'));
			
			Splash.show(body);
			
		}
		else{
			
			let voice = new Voice(data.id,'',data.name);
			
			await voice.accept(data.offer);
			
		}
		
	}
	
	static async VReady(data){
		
		await Voice.ready(data.id,data.answer);
		
	}
	
	static async VCandidate(data){
		
		await Voice.candidate(data.id,data.candidate);
		
	}
	
	static VKick(){
		
		Voice.destroy(true);
		
	}
	
}

class App {
	static RIGA = 'wss://pwclassic.isgood.host:443';
	static MOSCOW = 'wss://api2.26rus-game.ru:8443';
	static CLOUDFLARE = 'wss://api.26rus-game.ru:8443';
	static hostList = [this.RIGA, this.MOSCOW, this.CLOUDFLARE ];
	static bestHost = -1;

	static async findBestHostAndInit() {
		const sockets = [];
		let resolved = false;

		const handleOpen = (index) => {
			return () => {
				if (!resolved) {
					resolved = true;
					this.bestHost = index;
					
					sockets.forEach((socket, i) => {
						//if (i !== index && socket) {
							socket.close();
						//}
					});

					this.init();
				}
			};
		};

		for (let i = 0; i < this.hostList.length; i++) {
			try {
				const socket = new WebSocket(this.hostList[i]);
				sockets[i] = socket;
				
				socket.onopen = handleOpen(i);
				
				socket.onerror = () => {
					socket.close();
				};
			} catch (error) {
				console.error(`Error creating WebSocket for ${this.hostList[i]}:`, error);
			}
		}

		setTimeout(() => {
			if (this.bestHost == -1) {
				App.error("Нет соединения с API сервером Prime World Classic");
			}				 
		},30000);
	}

	static async init() {
		// wss://api2.26rus-game.ru:8443 - Москва (основа)
		// wss://relay.26rus-game.ru:8443 - Рига (Прокси)
		// wss://api.26rus-game.ru:8443 - США (прокси)
		App.api = new Api(this.hostList, this.bestHost, Events);
		
		await News.init();
		
		await Store.init();
		
		App.storage = new Store('u3');

		await App.storage.init({ id: 0, token: '', login: '' });

		await MM.init();
		/*
		setTimeout(() => {
			
			let obj = {id:1, users:{
				10:{nickname:'Nesh',hero:15,ready:1,rating:1300,select:false,team:1,banhero:59},
				1858:{nickname:'DOK',hero:6,ready:1,rating:1100,select:false,team:1,banhero:14},
				2:{nickname:'Коао',hero:12,ready:1,rating:1100,select:false,team:1,banhero:62},
				4:{nickname:'Lantarm',hero:24,ready:1,rating:1100,select:false,team:1,banhero:9},
				5:{nickname:'123',hero:8,ready:1,rating:1100,select:false,team:2,banhero:20},
				6:{nickname:'123',hero:2,ready:1,rating:1100,select:false,team:2,banhero:21},
				7:{nickname:'Farfania',hero:9,ready:1,rating:1100,select:false,team:2,banhero:22},
				8:{nickname:'Rekongstor',hero:25,ready:1,rating:1100,select:false,team:2,banhero:23},
				9:{nickname:'Hatem',hero:0,ready:1,rating:2200,select:false,team:2,banhero:26}
			},target:7,map:[4,2,App.storage.data.id,5,6,7,8,9,10,1858],mode:0};

			obj.users[App.storage.data.id] = {winrate:51,nickname:App.storage.data.login,hero:20,ready:0,rating:1284,select:true,team:1,mode:0,commander:true,banhero:16};
			
			MM.lobby(obj);
			
		},1000);
		
		setTimeout(() => {
			
			MM.chat({id:0,message:'тестовое сообщение'});
			MM.chat({id:2,message:'тестовое сообщение'});
			MM.chat({id:7,message:'тестовое сообщение'});
			
		},2000);
		*/
		/*
		setTimeout(() => {
			
			ARAM.briefing(6,1,() => alert(1));
			
		},3000);
		*/
		/*
		setTimeout(() => {
			
			Splash.show(DOM({style:'iframe-stats'},DOM({style:'iframe-stats-navbar',event:['click',() => Splash.hide()]},'X'),DOM({tag:'iframe',src:'https://stat.26rus-game.ru'})),false);
			
		},3000);
		*/
		Chat.init();
		
		try{
			
			await App.api.init();
			
		}
		catch(error){
			
			
			
		}

		App.ShowCurrentView();

		// App.backgroundAnimate = document.body.animate({backgroundSize:['150%','100%','150%']},{duration:30000,iterations:Infinity,easing:'ease-out'});

		if (App.isAdmin()) {

			document.body.append(DOM({ id: 'ADMStat' }));

		}
		
		Voice.init();

	}

	static ShowCurrentView() {
		if (App.storage.data.login) {
			
			View.show('castle');
			
		}
		else {

			View.show('authorization');

		}
	}

	static async ShowCurrentViewAsync() {
		if (App.storage.data.login) {
			
			await View.show('castle');
			
		}
		else {

			await View.show('authorization');

		}
	}

	static OpenExternalLink(url) {
		if (NativeAPI.status) {
			nw.Shell.openExternal(url);
		} else {
			window.open(url, url, 'popup');
		}
	}

	static async authorization(login, password) {

		if (!login.value) {

			login.setAttribute('style', 'background:rgba(255,0,0,0.3)');

			return App.error('Необходимо указать логин');

		}

		if (!password.value) {

			password.setAttribute('style', 'background:rgba(255,0,0,0.3)');

			return App.error('Необходимо указать пароль');

		}

		let request, analysis;

		try {

			analysis = NativeAPI.analysis();

		}
		catch (e) {



		}

		try {

			request = await App.api.request('user', 'authorization', { login: login.value.trim(), password: password.value.trim(), analysis: analysis });

		}
		catch (error) {

			return App.error(error);

		}

		await App.storage.set({ id: request.id, token: request.token, login: login.value, fraction: request.fraction });

		View.show('castle');

	}

	static setNickname(){
		
		const close = DOM({tag: 'div', style: 'close-button', event: ['click', () => Splash.hide()]});
		
		close.style.backgroundImage = 'url(content/icons/close-cropped.svg)';
		
		let template = document.createDocumentFragment();
			
		let title = DOM({tag: 'div', style: 'castle-menu-text'}, 'Сменить никнейм можно один раз в две недели');
		
		let name = DOM({tag:'input',placeholder:'Никнейм',value:App.storage.data.login});

		let button = DOM({style:'splash-content-button',event:['click', async () => {

				if(!name.value){
					
					Splash.hide();
					
					return;
					
				}
				
				if(App.storage.data.login == name.value){
					
					Splash.hide();
					
					return;
					
				}
				
				try{
					
					await App.api.request('user','set',{nickname:name.value});
					
				}
				catch(error){
					
					return App.error(error);
					
				}
				
				await App.storage.set({login:name.value});
				
				View.show('castle');
				
				Splash.hide();
				
			}
			
		]},'Применить');

		template.append(title, name, button, close);

		Splash.show(template);
		
	}
	
	static setFraction() {
    const close = DOM({tag: 'div', style: 'close-button', event: ['click', () => Splash.hide()]});
    close.style.backgroundImage = 'url(content/icons/close-cropped.svg)';
    
    let template = document.createDocumentFragment();
    
 
    const title = DOM({tag: 'h2', style: 'faction-title'}, 'Выбор Фракции');
    Object.assign(title.style, {
        textAlign: 'center',
        color: '#fff',
        textShadow: '0 0 5px rgba(0,0,0,0.5)',
        marginBottom: '30px',
        fontSize: '24px'
    });
    
  
    const factionsContainer = DOM({tag: 'div', style: 'factions-container'});
    Object.assign(factionsContainer.style, {
        display: 'flex',
        gap: '5%',  
        justifyContent: 'center',
        marginBottom: '30px',
        flexWrap: 'wrap',
        width: '90%',
        maxWidth: '600px',
        margin: '0 auto'
    });
    

    const factions = [
			{id: 1, name: 'Адорнийцы', icon: 'Elf_logo_over.webp'},
			{id: 2, name: 'Докты', icon: 'Human_logo_over2.webp'}
		];
		
	
		const calculateIconSize = () => {
			const windowWidth = window.innerWidth;
			if (windowWidth < 500) return '20vw';  
			if (windowWidth < 768) return '15vw';  
			return '120px';  
		};
		

		let selectedFaction = App.storage.data.fraction;
		

		factions.forEach(faction => {
			const factionElement = DOM({
				tag: 'div',
				style: 'faction-item',
				event: ['click', () => {
					selectedFaction = faction.id;

					factionsContainer.querySelectorAll('.faction-item').forEach(item => {
						item.style.transform = 'scale(1)';
						item.style.filter = 'brightness(0.7)';
						item.style.boxShadow = 'none';
					});

					factionElement.style.transform = 'scale(1.05)';
					factionElement.style.filter = 'brightness(1)';
					factionElement.style.boxShadow = '0 0 15px rgba(255,215,0,0.7)';
				}]
			});
			
			const iconSize = calculateIconSize();
			Object.assign(factionElement.style, {
				width: iconSize,
				height: iconSize,
				minWidth: '80px',
				minHeight: '80px',
				maxWidth: '150px',
				maxHeight: '150px',
				backgroundImage: `url(content/icons/${faction.icon})`,
				backgroundSize: 'contain',
				backgroundRepeat: 'no-repeat',
				backgroundPosition: 'center',
				cursor: 'pointer',
				transition: 'all 0.3s ease',
				transform: selectedFaction === faction.id ? 'scale(1.05)' : 'scale(1)',
				filter: selectedFaction === faction.id ? 'brightness(1)' : 'brightness(0.7)',
				boxShadow: selectedFaction === faction.id ? '0 0 15px rgba(255,215,0,0.7)' : 'none',
				borderRadius: '10px'
			});
			
			const nameLabel = DOM({tag: 'div', style: 'faction-name'}, faction.name);
			Object.assign(nameLabel.style, {
				textAlign: 'center',
				color: '#fff',
				marginTop: '10px',
				textShadow: '0 0 3px #000',
				fontSize: '16px'
			});
			
			const wrapper = DOM({tag: 'div', style: 'faction-wrapper'});
			Object.assign(wrapper.style, {
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				margin: '10px'
			});
			
			wrapper.append(factionElement, nameLabel);
			factionsContainer.append(wrapper);
		});
		
		const button = DOM({
			style: 'splash-content-button',
			event: ['click', async () => {
				if (!selectedFaction) {
					Splash.hide();
					return;
				}
				
				try {
					await App.api.request('user', 'set', {fraction: selectedFaction});
				} catch(error) {
					return App.error(error);
				}
				
				await App.storage.set({fraction: selectedFaction});
				View.show('castle');
				Splash.hide();
			}]
		}, 'Применить');
		
		const resizeHandler = () => {
			const iconSize = calculateIconSize();
			factionsContainer.querySelectorAll('.faction-item').forEach(icon => {
				icon.style.width = iconSize;
				icon.style.height = iconSize;
			});
		};
		
		window.addEventListener('resize', resizeHandler);
		
		close.addEventListener('click', () => {
			window.removeEventListener('resize', resizeHandler);
		});
		
		template.append(title, factionsContainer, button, close);
		Splash.show(template);
	}

	static async registration(fraction, invite, login, password, password2) {

		if ((!fraction.value) || (!invite.value) || (!login.value) || (!password.value) || (!password2.value)) {

			return App.error('Не все значения указаны');

		}

		if (password.value != password2.value) {

			password.setAttribute('style', 'background:rgba(255,0,0,0.3)');

			password2.setAttribute('style', 'background:rgba(255,0,0,0.3)');

			return App.error('Пароли не совпадают');

		}

		let request,analysis;
		
		try {

			analysis = NativeAPI.analysis();
			
		}
		catch (e) {



		}

		try {

			request = await App.api.request('user', 'registration', { fraction: fraction.value, invite: invite.value.trim(), login: login.value.trim(), password: password.value.trim(), analysis: analysis, mac: NativeAPI.getMACAdress() });

		}
		catch (error) {

			return App.error(error);

		}

		await App.storage.set({ id: request.id, token: request.token, login: login.value, fraction: fraction.value });

		View.show('castle');

	}

	static async exit() {

		await App.storage.set({ id: 0, token: '', login: '' });

		View.show('authorization');

	}

	static input(callback, object = new Object()) {

		if (!('tag' in object)) {

			object.tag = 'input';

		}

		if (!('value' in object)) {

			object.value = '';

		}

		let body = DOM(object);

		body.addEventListener('blur', async () => {

			if (body.value == object.value) {

				return;

			}

			if (callback) {

				try {

					await callback(body.value);

				}
				catch (e) {

					return;

				}

			}

			object.value = body.value;

		});

		return body;

	}

	static getRandomInt(min, max) {

		min = Math.ceil(min);

		max = Math.floor(max);

		return Math.floor(Math.random() * (max - min + 1)) + min;

	}

	static error(message, timeout = 3000) {

		let previousErrors = document.getElementsByClassName('error-message');
		let body;
		if (previousErrors.length == 0) {
			body = DOM({ style: 'error-message' });
			document.body.append(body);
		} else {
			body = previousErrors[0];
		}

		let msg = DOM({ tag: 'div' }, `${message}`);

		setTimeout(() => {

			msg.remove();

		}, timeout);

		body.append(msg);

	}

	static notify(message, delay = 0) {

		setTimeout(() => {

			let body = DOM({ style: 'notify-message' }, DOM({ tag: 'div' }, `${message}`));

			setTimeout(() => {

				body.remove();

			}, 3000);

			document.body.append(body);

		}, delay);

	}

	static isAdmin(id = 0) {

		return [1, 2, 24, 134, 865, 2220, 292, 1853, 12781].includes(Number((id ? id : App.storage.data.id)));

	}

	static href(url) {

		let a = DOM({ tag: 'a', href: url });

		a.click();

	}

}

class Voice {
	
	static peerConnectionConfig = {
		// проверка stun https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
		iceServers:[
		{urls:['turn:81.88.210.30:3478'],credential:'pw',username:'pw'}
		/*
		{url:'turn:192.158.29.39:3478?transport=udp',credential:'JZEOEt2V3Qb0y27GRntt2u2PAYA=',username:'28224511:1379330808'},
		{url:'turn:192.158.29.39:3478?transport=tcp',credential:'JZEOEt2V3Qb0y27GRntt2u2PAYA=',username:'28224511:1379330808'},
		{url:'turn:turn.bistri.com:80',credential:'homeo',username:'homeo'},
		{url:'turn:turn.anyfirewall.com:443?transport=tcp',credential:'webrtc',username:'webrtc'}
		*/
		]
		
	};
	
	static mediaAudioConfigManual = {
		echoCancellation:false,
		noiseSuppression:false,
		autoGainControl:false,
		channelCount:1,
		sampleRate:48000,
		sampleSize:16
	};
	
	static mediaAudioConfigHighQality = {
		echoCancellation:true,
		noiseSuppression:true,
		autoGainControl:true,
		channelCount:1,
		sampleRate:32000,
		sampleSize:16
	};
	
	static mediaAudioConfig = {
		echoCancellation:true,
		noiseSuppression:true,
		autoGainControl:true,
		channelCount:1,
		sampleRate:16000,
		sampleSize:16
	};
	
	static mediaAudioConfigLowQality = {
		echoCancellation:true,
		noiseSuppression:true,
		autoGainControl:true,
		channelCount:1,
		sampleRate:8000,
		sampleSize:16
	};
	
	static userMedia = null;
	
	static mic = null;
	
	static manager = new Object();
	
	static infoPanel = null;
	
	static cacheCandidate = new Object();
	
	static limit = 10;
	
	static init(){
		
		if(!Voice.infoPanel){
			
			Voice.infoPanel = DOM({style:'voice-info-panel'},DOM({style:'voice-info-panel-body'}));
			
		}
		
		document.body.append(Voice.infoPanel);
		
	}
	
	static async initAudio(){
		
		if(!Voice.userMedia){
			
			Voice.infoPanel.style.display = 'flex';
			
			try{
				
				Voice.userMedia = await navigator.mediaDevices.getUserMedia({audio:( App.isAdmin() ? Voice.mediaAudioConfigHighQality : Voice.mediaAudioConfig ),video:false});
				
			}
			catch(error){
				
				return App.error(`Не можем получить доступ к медиа устройствам: ${error}`);
				
			}
			
			let tracks = new Array();
			
			try{
				
				tracks = Voice.userMedia.getTracks();
				
			}
			catch(error){
				
				return App.error(`Не можем получить дорожки потоков: ${error}`);
				
			}
			
			if(!tracks.length){
				
				return App.error('Отсутствие медиа потоков');
				
			}
			
			if(tracks[0].kind != 'audio'){
				
				return App.error('Не можем найти микрофон по умолчанию');
				
			}
			
			Voice.mic = tracks[0];
			
			Voice.mic.enabled = false;
			
		}
		
	}
	
	static toggleEnabledMic(){
		
		if(!Voice.mic){
			
			return App.error('Мы не смогли определить ваш микрофон по умолчанию');
			
		}
		
		Voice.mic.enabled = !Voice.mic.enabled;
		
		if(Voice.mic.enabled){
			
			Sound.play('content/sounds/voice/enabled.mp3');
			
			Voice.infoPanel.firstChild.lastChild.style.opacity = 0;
			
		}
		else{
			
			Sound.play('content/sounds/voice/disabled.mp3');
			
			Voice.infoPanel.firstChild.lastChild.style.opacity = 1;
			
		}
		
	}
	
    static indication(source,callback){
		
		let audioContext = new AudioContext();
		
		let mediaStreamSource = audioContext.createMediaStreamSource(source);

		let analyser = audioContext.createAnalyser();
		
		mediaStreamSource.connect(analyser);
		
		analyser.fftSize = 256;
		
		let bufferLength = analyser.frequencyBinCount;
		
		let dataArray = new Uint8Array(bufferLength);
		
        let checkVolume = () => {
			
			analyser.getByteFrequencyData(dataArray);
			
			let sum = 0;
			
			for(let i = 0; i < bufferLength; i++){
				
				sum += dataArray[i];
				
			}
			
			let average = Math.round(sum / bufferLength);
			
			if(average > 100){
				
				average = 100;
				
			}
			
			if(callback){
				
				callback(average);
				
			}
			
			requestAnimationFrame(checkVolume);
			
        };
		
		checkVolume();
		
    }
	
	static updateInfoPanel(){
		
		while(Voice.infoPanel.firstChild.firstChild){
			
			Voice.infoPanel.firstChild.firstChild.remove();
			
		}
		
		let level = DOM({style:'voice-info-panel-body-item-bar-level'});
		
		let bar = DOM({style:'voice-info-panel-body-item-bar'},level);
		
		if(Voice.mic){
			
			Voice.indication(Voice.userMedia,(percent) => {
				
				level.style.width = `${percent}%`;
				
			});
			
		}
		else{
			
			bar.classList.add('voice-info-panel-body-item-nostream');
			
		}
		
		Voice.infoPanel.firstChild.append(DOM({style:'voice-info-panel-body-item'},DOM({style:'voice-info-panel-body-item-name',event:['click',() => Voice.toggleEnabledMic()]},App.storage.data.login),DOM({style:'voice-info-panel-body-item-status'},bar)));
		
		for(let id in Voice.manager){
			
			Voice.playerInfoPanel(id);
			
		}
		
		let tutorial = DOM({style:'voice-info-panel-body-tutorial'},'Нажмите CTRL + Z, чтобы включить микрофон!');
		
		if(Voice.mic){
			
			if(Voice.mic.enabled){
				
				tutorial.style.opacity = 0;
				
			}
			
		}
		
		Voice.infoPanel.firstChild.append(tutorial);
		
	}
	
	static playerInfoPanel(id){
		
		let name = (Voice.manager[id].name) ? Voice.manager[id].name : `id${id}`;
		
		let state = () => {
			
			let status = '';
			
			switch(Voice.manager[id].peer.connectionState){
				
				case 'new': status = 'ожидание ответа'; break;
				
				case 'connecting': status = 'соединение'; break;
				
				default: status = Voice.manager[id].peer.connectionState; break;
				
			}
			
			return (Voice.manager[id].peer.connectionState == 'connected') ? `${name} [Х]` : `${name} (${status})`;
			
		}
		
		let item = DOM({style:'voice-info-panel-body-item-name',event:['click',() => {
			
			Voice.manager[id].close();
			
			item.remove();
			
		}]},state());
		
		let level = DOM({style:'voice-info-panel-body-item-bar-level'});
		
		let bar = DOM({style:'voice-info-panel-body-item-bar'},level);
		
		let indication = () => {
			
			if( (Voice.manager[id].peer.connectionState == 'connected') && (Voice.manager[id].stream) ){
				
				Voice.indication(Voice.manager[id].stream,(percent) => {
					
					level.style.width = `${percent}%`;
					
				});
				
			}
			
			if(Voice.manager[id].stream){
				
				if(bar.classList.contains('voice-info-panel-body-item-nostream')){
					
					bar.classList.remove('voice-info-panel-body-item-nostream');
					
				}
				
			}
			else{
				
				if(!bar.classList.contains('voice-info-panel-body-item-nostream')){
					
					bar.classList.add('voice-info-panel-body-item-nostream');
					
				}
				
			}
			
		}
		
		indication();
		
		Voice.manager[id].peer.onconnectionstatechange = () => {
			
			item.innerText = state();
			
			indication();
			
		}
		
		Voice.infoPanel.firstChild.append(DOM({style:'voice-info-panel-body-item'},item,DOM({style:'voice-info-panel-body-item-status'},bar)));
		
	}
	
	static async ready(id,answer){
		
		if( !(id in Voice.manager) ){
			
			return;
			
		}
		
		if(Voice.manager[id].timer){
			
			clearTimeout(Voice.manager[id].timer);
			
		}
		
		await Voice.manager[id].peer.setRemoteDescription(answer);
		
		if(id in Voice.cacheCandidate){
			
			for(let candidate of Voice.cacheCandidate[id]){
				
				console.log('ОТПРАВИЛИ ICE кандидат из кэша:',candidate);
				
				await App.api.ghost('user','callCandidate',{id:id,candidate:candidate});
				
			}
			
			delete Voice.cacheCandidate[id];
			
		}
		
    }
	
	static async candidate(id,candidate){
		
		if( !(id in Voice.manager) ){
			
			return;
			
		}
		
		await Voice.manager[id].peer.addIceCandidate(candidate);
		
    }
	
	static destroy(full = false){
		
		for(let id in Voice.manager){
			
			if( (!full) && (Voice.manager[id].important) ){
				
				continue;
				
			}
			
			Voice.manager[id].close();
			
		}
		
		if(Voice.mic){
			
			if(full){
				
				Voice.mic.stop();
				
				Voice.mic = null;
				
				Voice.userMedia = null;
				
			}
			else{
				
				if(!Object.keys(Voice.manager).length){
					
					if(Voice.mic){
						
						Voice.mic.enabled = false;
						
					}
					
				}
				
			}
			
			Voice.updateInfoPanel();
			
		}
		
	}
	
	static async association(i,users,key){
		
		if(Settings.settings.novoice){
			
			throw 'Голосовая связь отключена';
			
		}
		
		let start = false;
		
		for(let user of users){
			
			if(user.id == i){
				
				start = true;
				
				continue;
				
			}
			
			if(!start){
				
				continue;
				
			}
			
			let voice = new Voice(user.id,key,user.name);
			
			await voice.call();
			
		}
		
	}
	
	constructor(id,key = '',name = '',important = false){
		
		this.id = id;
		
		this.key = key;
		
		this.name = name;
		
		this.important = important;
		
		this.isCaller = false;
		
		this.stream = null;
		
		this.controller = null;
		
		if( ( this.id in Voice.manager ) || ( ( Object.keys(Voice.manager).length + 1 ) > Voice.limit ) ){
			
			this.peer = null;
			
			return this;
			
		}
		
		this.peer = new RTCPeerConnection(Voice.peerConnectionConfig);
		
		Voice.manager[this.id] = this;
		
		this.peer.ontrack = (event) => {
			
			console.log('Получен удаленный медиапоток',event);
			
			this.stream = new MediaStream([event.track]);
			
			this.controller = new Audio();
			
			this.controller.srcObject = this.stream;
			
			this.controller.autoplay = true;
			
			this.controller.controls = true;
			
			this.controller.volume = 1.0;
			
			this.controller.play();
			
			document.body.prepend(this.controller);
			
			this.controller.style.display = 'none';
			
		}
		
		this.peer.onicecandidate = async (event) => {
			
			if(event.candidate){
				
				console.log('Сгенерирован ICE кандидат:',event.candidate);
				
				if(this.peer.remoteDescription){
					
					console.log('ОТПРАВИЛИ ICE кандидат:',event.candidate);
					
					await App.api.ghost('user','callCandidate',{id:this.id,candidate:event.candidate});
					
				}
				else{
					
					if( !(this.id in Voice.cacheCandidate) ){
						
						Voice.cacheCandidate[this.id] = new Array();
						
					}
					
					Voice.cacheCandidate[this.id].push(event.candidate);
					
				}
				
			}
			else{
				
				console.log('Все ICE кандидаты собраны');
				
			}
			
		}
		
		this.peer.oniceconnectionstatechange = () => {
			
			switch(this.peer.iceConnectionState){
				
				case 'connected': console.log('Соединение успешно установлено'); break;
				
				case 'disconnected': this.close(); break; // reconnect
				
				case 'failed': this.close(); break; // reconnect
				
				case 'closed': this.close(); break;
				
			}
			
			console.log(`Состояние соединения: ${this.peer.iceConnectionState}`);
			
		};
		
	}
	
	async call(){
		
		if(Settings.settings.novoice){
			
			throw 'Голосовая связь отключена';
			
		}
		
		if(!this.peer){
			
			return;
			
		}
		
		if(this.isCaller){
			
			return;
			
		}
		
		await Voice.initAudio();
		
		if(Voice.mic){
			
			this.peer.addTrack(Voice.mic);
			
		}
		
		let offer = await this.peer.createOffer({offerToReceiveAudio:true,offerToReceiveVideo:false});
		
		await this.peer.setLocalDescription(offer);
		
		this.timer = setTimeout(() => {
			
			this.timer = null;
			
			this.close();
			
		},15000);

		await App.api.request('user','call',{id:this.id,key:this.key,offer:offer});
		
		this.isCaller = true;
		
		Voice.updateInfoPanel();
		
	}
	
	async accept(offer){
		
		if(Settings.settings.novoice){
			
			throw 'Голосовая связь отключена';
			
		}
		
		if(!this.peer){
			
			return;
			
		}
		
		await Voice.initAudio();
		
		if(Voice.mic){
			
			this.peer.addTrack(Voice.mic);
			
		}
		
		await this.peer.setRemoteDescription(offer);
		
		let answer = await this.peer.createAnswer();
		
		await App.api.ghost('user','callAccept',{id:this.id,answer:answer});
		
		await this.peer.setLocalDescription(answer);
		
		Voice.updateInfoPanel();
		
	}
	
	async reconnect(){
		console.log('Реконнект...');
		this.close();
		
		if(!this.isCaller){
			
			return;
			
		}
		
		let voice = new Voice(this.id,this.key);
		
		try{
			
			voice.call();
			
		}
		catch(error){
			
			console.log(error);
			
		}
		
	}
	
	async close(){
		
		this.peer.close();
		
		delete Voice.manager[this.id];
		
		if(this.id in Voice.cacheCandidate){
			
			delete Voice.cacheCandidate[this.id];
			
		}
		
		Voice.updateInfoPanel();
		
	}
	
}

class Chat {

	static body;

	static hide = false;

	static to = 0;

	static initView() {
		let scrollBtn = DOM({
			style: 'scroll-btn',
			event: ['click', () => {
				Chat.scroll(true);
			}],
			title: 'Прокрутить чат вниз' // Добавляем описание при наведении
		}, '▼'); // Замените '▼' на нужный вам текст или символ для кнопки прокрутки

		let input = DOM({
			tag: 'input',
			style: 'chat-input',
			placeholder: Lang.text('enterTextAndPressEnter')
		});

		Chat.input = DOM({ style: 'chat-input-container' }, input, scrollBtn);

		Chat.body = DOM({ style: 'chat' }, DOM({ style: 'chat-body' }), Chat.input);

		const handleSend = async (event) => {
			if (event.key === 'Enter' || event.keyCode === 13 || event.code === 'Enter' || event.code === 'NumpadEnter') {
				event.preventDefault();
				await Chat.sendMessage();
			}
		};

		input.addEventListener('keyup', handleSend);
		input.addEventListener('keypress', handleSend);
		input.addEventListener('keydown', handleSend);


		input.addEventListener('input', () => {

			if (!Chat.input.firstChild.value) {

				Chat.to = 0;

			}

		});
	}

	static init() {

		Chat.initView();

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

		}
		else {

			Chat.body.style.display = 'none';

			Chat.hide = true;

		}
	}

	static wrapLinksInATag(message) {
		const urlRegex = /(https:\/\/[^\s]+)/g;
		return message.replace(urlRegex, '<a href="$1">$1</a>');
	}

	static viewMessage(data) {

		let nickname = DOM({ tag: 'div' }, data.nickname + ": ");

		let message = DOM({ tag: 'div' });

		if (data.id == 1) {

			if (String(data.message).slice(0, 5) == 'https') {

				message.append(DOM({ tag: 'img', src: data.message }));

			}
			else {

				message.innerText = `${data.message}`;

			}

		}
		else {

			message.innerText = `${data.message}`;

		}

		if (App.isAdmin(data.id)) {
			
			if ((String(data.message).includes('https')) && (!String(data.message).includes('.gif'))) {
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

		}
		else if (data.to == App.storage.data.id) {

			message.style.color = 'rgba(51,255,0,0.9)';

		}

		if (data.id == 1) {

			nickname.style.color = 'transparent';

			nickname.style.fontWeight = 600;

			nickname.classList.add('owner-text');

		}
		else if (data.id == -2) {

			nickname.style.color = 'transparent';

			nickname.style.fontWeight = 600;

			nickname.classList.add('telegrambot-text');

		}
		else if (App.isAdmin(data.id)) {

			nickname.style.color = 'transparent';

			nickname.style.fontWeight = 600;

			nickname.classList.add('administration-text');

		}

		let item = DOM({
			style: 'chat-body-item', event: ['click', () => {

				Chat.to = data.id;

				Chat.body.lastChild.firstChild.value = `@${data.nickname}, `;

				Chat.input.firstChild.focus();

			}]
		}, nickname, message);

		item.addEventListener('contextmenu', () => {

			if (App.isAdmin()) {

				let body = document.createDocumentFragment();

				body.append(DOM(`Выдать мут чата ${data.nickname}?`), DOM({
					style: 'splash-content-button', event: ['click', async () => {

						await App.api.request('user', 'mute', { id: data.id });

						Splash.hide();

					}]
				}, 'Да'), DOM({ style: 'splash-content-button', event: ['click', async () => Splash.hide()] }, 'Нет'));

				Splash.show(body);

			}

			return false;

		});

		Chat.body.firstChild.prepend(item);

		Chat.scroll();

	}

	static async sendMessage() {

		if (Chat.input.firstChild.value.length > 128) {

			return;

		}

		await App.api.request('user', 'chat', { message: Chat.input.firstChild.value, to: Chat.to });

		Chat.to = 0;

		Chat.input.firstChild.value = '';

	}

	static scroll(forceScroll = false) {

		if (Chat.body.firstChild.children.length && (forceScroll || Chat.body.firstChild.firstChild.offsetTop == Chat.body.firstChild.firstChild.offsetHeight)) {

			Chat.body.firstChild.firstChild.scrollIntoView({ block: 'end', behavior: 'smooth' });

		}

	}

}

class HTTP {

	static async request(url, type = '') {

		let response = await fetch(url);

		switch (type) {

			case 'text': return await response.text(); break;

			case 'arrayBuffer': return await response.arrayBuffer(); break;

			default: return await response.json(); break;

		}

	}

}

class PWGame {

	static PATH = '../Game/Bin/PW_Game.exe';

	static WORKING_DIR_PATH = '../Game/Bin/';

	static LUTRIS_EXEC = 'lutris lutris:rungame/prime-world';

	static PATH_UPDATE = '../Tools/PW_NanoUpdater.exe';

	static PATH_UPDATE_LINUX = '../update.sh';

	static PATH_TEST_HASHES = './content/PW_HashTest.exe';

	static gameServerHasConnection = false;

	static mainServerHasConnection = false;

	static radminHasConnection = false;

	static proxyHasConnection = false;

	static gameConnectionTestIsActive = false;

	static isUpToDate = false;

	static isValidated = false;

	static isUpdateFailed = false;

	static isTestHashesFailed = false;

	static gameServerConnectionCheckTimeout = 1000 * 60 * 100; // 100 minutes

	static currentPlayPwProtocol = 'pwclassic://runGame/Tester00Tester00Tester00Tester004c8fa55b5ee54d6ddbaab2373f8a6a74d7f9c5d739bdd79da12f3beda73c7115/2.0.0/0';

	static protocolServer;

	static async openProtocolSocket() {
		try {
			const http = NativeAPI.http;

			if (PWGame.protocolServer) {
				PWGame.protocolServer.close(() => { });
			}

			PWGame.protocolServer = http.createServer((req, res) => {
				if (req.url === '/getConnectionData' && req.method === 'POST') {
					res.writeHead(200, { 'Content-Type': 'text/plain' });
					res.end(JSON.stringify({ protocol: PWGame.currentPlayPwProtocol }));

					//PWGame.protocolServer.close(() => {});
				} else {
					res.writeHead(404, { 'Content-Type': 'text/plain' });
					res.end('Not Found');
				}
			});

			PWGame.protocolServer.listen(34980, '127.0.0.1', () => { });
		} catch (e) {
			App.error(e, 30000);
		}
	}

	static GetPlayPwProtocol(id) {
		let chosenServer = PWGame.mainServerHasConnection ? 0 : 2;
		if (Settings.settings.radminPriority && PWGame.radminHasConnection) {
			chosenServer = 1;
		}
		return `pwclassic://runGame/${id}/${PW_VERSION}/${chosenServer}`;
	}

	static async start(id, callback) {

		await PWGame.check();

		PWGame.currentPlayPwProtocol = PWGame.GetPlayPwProtocol(id);

		PWGame.openProtocolSocket();

		if (NativeAPI.platform == 'linux') {
			let spawn = await NativeAPI.childProcess.exec(PWGame.LUTRIS_EXEC);
			spawn.on('close', async (code) => {
				callback();
			});

		} else {
			await NativeAPI.exec(PWGame.PATH, PWGame.WORKING_DIR_PATH, ['protocol', PWGame.currentPlayPwProtocol], callback);
		}

	}

	static async reconnect(id, callback) {

		this.start(id, callback);

	}

	static async check() {

		if (!NativeAPI.status) {

			//throw 'Необходима Windows версия лаунчера';

		}

		await NativeAPI.fileSystem.promises.access(PWGame.PATH);

	}

	static async checkUpdates() {
		if (PWGame.isUpdateFailed) {
			throw 'Не удалось обновить игру! Обратитесь в поддержку PWClassic';
		}
		if (PWGame.isTestHashesFailed) {
			throw 'Файлы игры повреждены! Обратитесь в поддержку PWClassic';
		}
		if (!PWGame.isUpToDate) {
			//throw 'Проверка обновления не завершена! Подождите';
		}
		if (!PWGame.isValidated) {
			//throw 'Проверка файлов не завершена! Подождите';
		}
	}


	static gameServerIps = [
		'http://81.88.210.30:27302/api',
		'http://26.133.141.83:27302/api', // test connection to Radmin IP
		'http://46.32.186.159:27302/api',
	];
	static MAIN_GAME_SERVER_IP = 0
	static RADMIN_GAME_SERVER_IP = 1;
	static PROXY_GAME_SERVER_IP = 2;

	static async testServerConnection(serverIp) {
		const data = {
			method: 'checkConnection'
		};
		try {
			let response = await fetch(serverIp, {
				method: "POST",
				body: JSON.stringify(data),
				headers: {
					"Content-type": "application/json; charset=UTF-8"
				}
			});
			return true;
		} catch (e) {
			// No connection
		}
		return false;
	}

	static async testGameServerConnection() {
		if (PWGame.gameServerHasConnection) {
			return;
		}

		for (let ip of PWGame.gameServerIps) {
			if (PWGame.testServerConnection(ip)) {
				PWGame.gameServerHasConnection = true;

				setTimeout(_ => {
					PWGame.gameServerHasConnection = false;
				}, PWGame.gameServerConnectionCheckTimeout);

				break;
			}
		}
		if (!PWGame.gameServerHasConnection) {
			throw 'Игровой сервер недоступен!';
		}
	}

}

class NativeAPI {

	static status = false;

	static platform;

	static title;
	static updated = false;
	static curLabel;
	static lastBranchV = null;

	static modules = {

		fileSystem: 'fs',
		childProcess: 'child_process',
		os: 'os',
		path: 'path',
		crypto: 'crypto',
		net: 'net',
		http: 'http'

	};

	static setDefaultWindow() {

		NativeAPI.window.width = 1280;

		NativeAPI.window.height = 720;

		NativeAPI.window.setMinimumSize(1280, 720);

		NativeAPI.window.setResizable(true);

		NativeAPI.window.setPosition('center');

		NativeAPI.window.enterFullscreen();

	}

	static init() {

		try {

			if (!nw) {

				return;

			}

		}
		catch (e) {

			return;

		}

		NativeAPI.status = true;

		NativeAPI.window = nw.Window.get();

		NativeAPI.setDefaultWindow();

		NativeAPI.app = nw.App;

		NativeAPI.altEnterShortcut = new nw.Shortcut({
			key: 'Alt+Enter', active: () => {
				Settings.settings.fullscreen = !Settings.settings.fullscreen;
				Settings.ApplySettings();
			}
		});

		NativeAPI.app.registerGlobalHotKey(NativeAPI.altEnterShortcut);
		
		NativeAPI.voiceShortcut = new nw.Shortcut({
			key: 'Ctrl+Z', active: () => {
				
				Voice.toggleEnabledMic();
				
			},
			failed: (error) => {
				
				console.log(error);
				
			}
		});
		
		NativeAPI.app.registerGlobalHotKey(NativeAPI.voiceShortcut);
		
		NativeAPI.voiceDestroyShortcut = new nw.Shortcut({
			key: 'Ctrl+K', active: () => {
				
				Voice.destroy();
				
			},
			failed: (error) => {
				
				console.log(error);
				
			}
		});
		
		NativeAPI.app.registerGlobalHotKey(NativeAPI.voiceDestroyShortcut);
		
		NativeAPI.loadModules();

		NativeAPI.platform = NativeAPI.os.platform();

		window.addEventListener('error', (event) => NativeAPI.write('error.txt', event.error.toString()));

		window.addEventListener('unhandledrejection', (event) => NativeAPI.write('unhandledrejection.txt', event.reason.stack));

	}

	static loadModules() {

		for (let module in NativeAPI.modules) {

			NativeAPI[module] = require(NativeAPI.modules[module]);

		}

	}

	static async exec(exeFile, workingDir, args, callback, cwd = process.cwd()) {

		return new Promise((resolve, reject) => {

			if (!NativeAPI.status) {

				reject();

			}

			let workingDirPath = NativeAPI.path.join(cwd, workingDir);
			let executablePath = NativeAPI.path.join(cwd, exeFile);
			NativeAPI.childProcess.execFile(executablePath, args, { cwd: workingDirPath }, (error, stdout, stderr) => {

				if (error) {

					reject(error);

				}

				resolve(stdout);

				if (callback) {

					callback();

				}

			});

		});

	}

	static reset() {

		if (!NativeAPI.status) {

			return;

		}

		NativeAPI.app.clearCache();

		NativeAPI.window.reload();

	}

	static progress(value = 0.0) {

		if (!NativeAPI.status) {

			return;

		}

		NativeAPI.window.setProgressBar(value);

	}

	static attention() {

		if (!NativeAPI.status) {

			return;

		}

		NativeAPI.window.focus();

		NativeAPI.window.requestAttention(true);

	}

	static exit() {

		if (!NativeAPI.status) {

			return false;

		}

		NativeAPI.app.quit();

		return true;

	}

	static testHashes() {
		if (NativeAPI.platform == 'linux') {
			PWGame.isValidated = true;
			return; // No hash check for linux
		}
		NativeAPI.fileSystem.promises.access(PWGame.PATH_TEST_HASHES);

		let spawn = NativeAPI.childProcess.spawn(PWGame.PATH_TEST_HASHES);

		spawn.on('close', (code) => {
			if ((code == 0)) {
				PWGame.isValidated = true;
				App.notify('Проверка обновлений и файлов игры завершена');
			} else {
				PWGame.isTestHashesFailed = true;
				App.error('Проверка файлов не выполнена: ' + code);
			}
		});
	}

	static updateLinux(data, callback) {
		let outputs = data.toString().split('\n');  // I have used space, you can use any thing.
		for (let o of outputs) {
			if (o == 'Updating game files') {
				this.title = 'Обновление игры';
				this.curLabel = 'game';
				continue;
			}
			if (o == 'Updating launcher') {
				this.title = 'Обновление лаунчера';
				this.curLabel = 'content';
				continue;
			}

			if (o.startsWith('* main')) {
				if (this.lastBranchV == null) {
					this.lastBranchV = o;
				} else {
					this.updated = this.lastBranchV != o;
				}
			}
            
            if (o.startsWith('Receiving objects:')) {
                let percent = parseInt(o.substring(19, o.indexOf('%')));
					
				callback({update:true,title:this.title,total:percent});
				
				NativeAPI.progress(percent / 100);
            }
		}

	}

	static updateWindows(data, callback) {

		let progressDataElements = data.toString().substring(1).split('#');

		for (let progressDataElement of progressDataElements) {

			let json = JSON.parse(progressDataElement);

			if (json.type) {

				if (json.type == 'bar') {

					if (this.curLabel == 'content') {
						this.updated = true;
					}

					callback({ update: true, title: this.title, total: Number(json.data) });

					NativeAPI.progress(Number(json.data) / 100);

				}
				else if (json.type == 'label') {

					switch (json.data) {

						case 'game': this.title = 'Обновление игры'; this.curLabel = json.data; break;

						case 'content': this.title = 'Обновление лаунчера'; this.curLabel = json.data; break;

						case 'game_data0': this.title = 'Загрузка игровых архивов 1/8'; this.curLabel = json.data; break;
						case 'game_data1': this.title = 'Загрузка игровых архивов 2/8'; this.curLabel = json.data; break;
						case 'game_data2': this.title = 'Загрузка игровых архивов 3/8'; this.curLabel = json.data; break;
						case 'game_data3': this.title = 'Загрузка игровых архивов 4/8'; this.curLabel = json.data; break;
						case 'game_data4': this.title = 'Загрузка игровых архивов 5/8'; this.curLabel = json.data; break;
						case 'game_data5': this.title = 'Загрузка игровых архивов 6/8'; this.curLabel = json.data; break;
						case 'game_data6': this.title = 'Загрузка игровых архивов 7/8'; this.curLabel = json.data; break;
						case 'game_data7': this.title = 'Загрузка игровых архивов 8/8'; this.curLabel = json.data; break;

						default: this.title = 'Загрузка игровых архивов'; this.curLabel = json.data; break;

					}

				}

			}

		}

	}

	static async update(callback) {

		if (!NativeAPI.status) {

			return false;

		}

		const isLinuxUpdate = NativeAPI.platform == 'linux';

		const updaterPath = isLinuxUpdate ? PWGame.PATH_UPDATE_LINUX : PWGame.PATH_UPDATE;

		await NativeAPI.fileSystem.promises.access(updaterPath);

		let spawn = NativeAPI.childProcess.spawn(updaterPath);

		App.notify('Проверка обновлений и файлов игры... Подождите');

		spawn.stdout.on('data', (data) => {
			if (isLinuxUpdate) {
				this.updateLinux(data, callback)
			} else {
				this.updateWindows(data, callback)
			}
		});

		spawn.on('close', async (code) => {

			callback({ update: false, title: '', total: 0 });

			NativeAPI.progress(-1);

			if ((code == 0 || code == null)) {
				PWGame.isUpToDate = true;
				try {
					NativeAPI.testHashes();
				}
				catch (e) {
					App.error('Неисправна проверка файлов: ' + e);
				}
			} else {
				PWGame.isUpdateFailed = true;
				App.error('Ошибка обновления: ' + code);

			}

			if (this.updated) {
				NativeAPI.reset();
			}

		});

	}

	static analysis() {

		if (!NativeAPI.status) {

			return false;

		}

		let username = '', cpus = NativeAPI.os.cpus();

		try {

			let userInfo = NativeAPI.os.userInfo();

			username = userInfo.username;

		}
		catch (error) {



		}

		return {

			hostname: NativeAPI.os.hostname(),
			core: { model: (cpus.length ? cpus[0].model : ''), total: cpus.length },
			memory: Math.round((NativeAPI.os.totalmem() / 1024) / 1024),
			version: NativeAPI.os.version(),
			release: NativeAPI.os.release(),
			username: username

		};

	}
	
	static getMACAdress(){
		
		let result = new Array();
		
		if(!NativeAPI.status){
			
			return result;
			
		}
		
		try{
			
			let networkInterfaces = NativeAPI.os.networkInterfaces();
			
			for(let key in networkInterfaces){
				
				if(['Radmin VPN'].includes(`${key}`)){
					
					continue;
					
				}
				
				for(let networkInterface of networkInterfaces[key]){
					
					if(networkInterface.internal){
						
						continue;
						
					}
					
					if( !('mac' in networkInterface) || (!networkInterface.mac) || (networkInterface.mac == '00:00:00:00:00:00') ){
						
						continue;
						
					}
					
					if(!result.includes(`${networkInterface.mac}`)){
						
						result.push(`${networkInterface.mac}`);
						
					}
					
				}
				
			}
			
			
		}
		catch(error){
			
			console.log(error);
			
		}
		
		return result;
		
	}
	
	static getLocale(){
		
		let result = '';
		
		if(!NativeAPI.status){
			
			return result;
			
		}
		
		try{
			
			result = Intl.DateTimeFormat().resolvedOptions().locale;
			
		}
		catch(error){
			
			
			
		}
		
		return result;
		
	}

	static async ping(hostname, port = 80, timeout = 3000) {

		return new Promise((resolve) => {

			const start = performance.now();

			const socket = NativeAPI.net.createConnection(port, hostname);

			socket.setTimeout(timeout);

			socket.on('connect', () => {

				const end = performance.now();

				socket.end();

				resolve(end - start);

			});

			function handleError() {

				socket.destroy();

				resolve(-1);

			}

			socket.on('timeout', handleError);

			socket.on('error', handleError);

		});

	}

	static async write(file, body, append = false) {
		if (append) {
			await NativeAPI.fileSystem.promises.appendFile(file, body);
		} else {
			await NativeAPI.fileSystem.promises.writeFile(file, body);
		}

	}

	static linkHandler(evt) {
		if (NativeAPI.status) {
			evt.preventDefault();
			let url = evt.target.href;
			if (evt.currentTarget.href) {
				url = evt.currentTarget.href;
			}
			App.OpenExternalLink(url);
		}
	}

}

class CastleBuildingsEvents {
	static library() {
		Window.show('main', 'inventory');
	}
	static talent_farm() {
		Window.show('main', 'farm');
	}
}

class Castle {

	static canvas;

	static gl;

	static AUDIO_MUSIC = 0;
	static AUDIO_SOUNDS = 1;
	static GetVolume(type) {
		// Используем настройки из Settings вместо внутренних переменных
		const global = Settings.settings.globalVolume ?? 1.0;
		const music = Settings.settings.musicVolume ?? 0.5;
		const sounds = Settings.settings.soundsVolume ?? 0.3;
	
		if (type == Castle.AUDIO_MUSIC) {
			return global * music;
		}
		if (type == Castle.AUDIO_SOUNDS) {
			return global * sounds;
		}
		return 1.0; // Значение по умолчанию
	}
	static testSoundIsPlaying = false;

	static RENDER_LAYER_LAUNCHER = 0;
	static RENDER_LAYER_GAME = 1;
	static RENDER_LAYER_PLAYER = 2;

	static render = [true, true, true];

	static MUSIC_LAYER_PLAYER = 0;
	static MUSIC_LAYER_GAME = 1;
	static MUSIC_LAYER_TAMBUR = 2;

	static music = [true, true, true];

	static identityMatrix;

	static viewMatrix;

	static flipMatr;

	static viewMatrix2;

	static projMatrix;

	static viewProjMatr;

	static cursorBasis = new Float32Array(4);

	static cursorDeltaBasis = new Float32Array(4);

	static cursorBasis2 = new Float32Array(4);

	static viewProjInv = new Float32Array(16);

	static isSMEnabled;

	static isBuildingsLoaded = false;
	static isStaticSMCached = false;

	static lightViewProjMatrix;

	static depthTexture;

	static gridTexture;

	static depthFramebuffer;

	static depthTextureSize = 8192;

	static zNear = 10.0;

	static zFar = 4500.0;

	static canvasWidth;

	static canvasHeight;

	static zNearSM = 0.1;

	static zFarSM = 1200.0;

	static zeroTranslation = [1072, 1360];

	static gridTranslation;

	static cursorPosition = [0, 0];

	static gridCursorPosX;

	static gridCursorPosZ;

	static minFov = 35;

	static maxFov = 55;

	static fixedFovValues = [55, 45, 35, 25, 55, 45, 35];

	static fixedRotationTiltValues = [0, 0, 0, 0, -0.8, -0.9, -0.8];

	static fixedCameraHeightValues = [0, 0, 0, 0, 350, 350, 350];

	static initialFixedValue = 1.0;

	static currentFixedValue = 1.0;

	static targetFixedValue = 1.0;

	static cameraAnimationSpeed = 4.0;

	static fov = Castle.fixedFovValues[Math.floor(Castle.currentFixedValue)];

	static rotationTilt = Castle.fixedRotationTiltValues[Math.floor(Castle.currentFixedValue)];

	static cameraHeight = Castle.fixedCameraHeightValues[Math.floor(Castle.currentFixedValue)];

	static doMove = false;
	static wasMoved = false;

	static cursorDeltaPos = [0.0, 0.0];

	static camDeltaPos = [0.0, 0.0];

	static camDeltaPosMinMax = [[-50, 10], [-50, 10]];

	static loadTime = Date.now();

	static currentTime = Date.now();

	static prevTime = Date.now();

	static deltaTime = 0;

	static scenesJson;

	static globalCanvas;

	static currentSceneName;

	static sceneObjects = [];

	static buildMode = false;

	static buildings = [
		"grid",

		"crystal_farm",
		"food_farm",
		"heavy_farm",
		"light_farm",
		"silver_farm",
		"talent_farm",

		"clan_house",
		"fair",
		"house",
		"library",
		"storage",

		"agility",
		"cunning",
		"health",
		"intelligence",
		"strength",
		"tavern",

		"cat",
		"dog",
		"unicorn",

		"deco_0",
		"deco_1",
		"deco_2",
		"deco_3",
		"deco_4",
		"deco_5",
		"deco_6",
		"deco_7",
		"deco_8",
		"deco_9",
		"deco_10",
		"deco_11",
		"deco_12",
		"deco_13",
		"deco_14",
		"deco_15",
		"deco_16",
		"deco_17",
		"deco_18",
		"deco_19",
		"deco_20",
		"deco_21",
		"deco_22",
		"deco_23",
		"deco_24",
		"deco_25",
		"deco_26",
		"deco_27",
		"deco_28",
		"deco_29",
		"deco_30",
		"deco_31",
		"deco_32",
	];

	static defaultPlacedBuildings = [
		{
			id: 10,
			rot: 0,
			posX: 20,
			posY: 18
		},
		{
			id: 6,
			rot: 0,
			posX: 10,
			posY: 27
		}
	];

	static placedBuildings = [];

	static allowedToBuildGridTex = new Uint8Array(64 * 64 * 4).fill(0);
	static allowedToBuildGrid = Array.from(Array(47), () => new Array(38));

	static phantomBuildingSize = 0;
	static phantomBuilding = {
			id: 0,
			rot: 0,
			posX: 0,
			posY: 1000
	};
	static BUILDING_OUTLINE_BAD = [40, 0, 0, 2];
	static BUILDING_OUTLINE_GOOD = [0, 40, 0, 2];
	static BUILDING_OUTLINE_SELECTION = [40, 40, 0, 2];
	static phantomBuildingIsAllowedToBuild = false;

	static buildingsNames = [
		["",""],
		["pearl_farm_ad","pearl_farm_doct"],
		["mushroom_farm_ad","mushroom_farm_doct"],
		["rubber_tree_ad","rubber_tree_doct"],
		["spinning_mill_ad","spinning_mill_doct"],
		["weaving_workshop_ad","weaving_workshop_doct"],
		["talent_garden_ad","talent_garden_doct"],
		["clan_house_ad","clan_house_doct"],
		["fair_ad","fair_doct"],
		["mansion_ad","mansion_doct"],
		["library_ad","library_doct"],
		["storage_ad","storage_doct"],
		["arena_ad","arena_doct"],
		["spire_ad","spire_doct"],
		["alcove_ad","alcove_doct"],
		["temple_ad","temple_doct"],
		["monument_ad","monument_doct"],
		["tea_house_ad","tea_house_doct"],
		["cat_house_ad","cat_house_doct"],
		["dog_house_ad","dog_house_doct"],
		["unicorn_house_ad","unicorn_house_doct"],
		["scarlet_flower_ad","scarlet_flower_doct"],
		["amber_flower_ad","amber_flower_doct"],
		["signpost_ad","signpost_doct"],
		["statue_ad","statue_doct"],
		["drums_ad","drums_doct"],
		["palm_with_bird_ad","palm_with_bird_doct"],
		["fountain_ad","fountain_doct"],
		["lantern_shop_ad","lantern_shop_doct"],
		["crimson_bush_ad","crimson_bush_doct"],
		["azure_bush_ad","azure_bush_doct"],
		["crimson_inflorescence_ad","crimson_inflorescence_doct"],
		["purple_inflorescence_ad","purple_inflorescence_doct"],
		["hedge_ad","hedge_doct"],
		["hedge_flowering_ad","hedge_flowering_doct"],
		["hedge_flowering2_ad","hedge_flowering2_doct"],
		["column_ad","column_doct"],
		["flower_bed_ad","flower_bed_doct"],
		["flower_bed2_ad","flower_bed2_doct"],
		["flower_bed3_ad","flower_bed3_doct"],
		["flower_bed4_ad","flower_bed4_doct"],
		["small_tree_ad","small_tree_doct"],
		["blooming_sakura_ad","blooming_sakura_doct"],
		["bonsai_ad","bonsai_doct"],
		["blooming_bonsai_ad","blooming_bonsai_doct"],
		["reed_tower_ad","reed_tower_doct"],
		["miniature_garden_ad","miniature_garden_doct"],
		["big_sakura_ad","big_sakura_doct"],
		["huge_cactus_ad","huge_cactus_doct"],
		["rafflesia_ad","rafflesia_doct"],
		["flytrap_ad","flytrap_doct"],
		["figured_reed_ad","figured_reed_doct"],
		["banana_palm_ad","banana_palm_doct"],
		["coconut_palm_ad","coconut_palm_doct"]
	];

	static toggleMusic(layer, value) {
		Castle.music[layer] = value ? value : !Castle.music[layer];
		if (Castle.music.includes(false)) {
			Sound.pause('castle');
		} else {
			Sound.unpause('castle');
			Sound.setVolume('castle', Castle.GetVolume(Castle.AUDIO_MUSIC));
		}
	}

	static toggleRender(layer, value) {
		Castle.render[layer] = value ? value : !Castle.render[layer];
	}

	static zoom(event) {

		if (Math.abs(Castle.currentFixedValue - Castle.targetFixedValue) > 0.04) {
			// camera animation is not finished
			return;

		}
		// Reset
		Castle.currentFixedValue = Castle.targetFixedValue;

		Castle.initialFixedValue = Castle.currentFixedValue;
		// Setup new target
		Castle.targetFixedValue = Castle.currentFixedValue + (event.deltaY > 0 ? -1 : +1);

		Castle.targetFixedValue = Castle.clamp(Castle.targetFixedValue, 0, Castle.fixedFovValues.length - 1);

	}

	static prepareMove(event) {

		if (Castle.phantomBuilding.id == 0) {
			Castle.doMove = true;
		}

	}

	static stopMove(event) {
		Castle.doMove = false
		setTimeout(_ => { Castle.wasMoved = false }, 100);

	}

	static moveMouse(event) {

		if (Castle.doMove) {

			Castle.cursorDeltaPos[0] = event.movementX * 2.0;

			Castle.cursorDeltaPos[1] = event.movementY * 2.0;

			if (Math.abs(event.movementX + event.movementY) > 0.1) {
				Castle.wasMoved = true;
			}

		} else {

			Castle.cursorDeltaPos[0] = 0;

			Castle.cursorDeltaPos[1] = 0;

		}

		Castle.cursorPosition[0] = event.offsetX;

		Castle.cursorPosition[1] = event.offsetY;

		let shift = [Castle.gridTranslation[0], Castle.gridTranslation[1]];
		if (Castle.phantomBuilding.id > 0 && Castle.gridCursorPosX && Castle.gridCursorPosX) {
			const size = Castle.sceneBuildings[Castle.buildings[Castle.phantomBuilding.id]].size[0];
			Castle.phantomBuilding.posX = Math.floor((shift[0]-Castle.gridCursorPosX) / 7.0 - size / 2.0);
			Castle.phantomBuilding.posY = Math.floor((shift[1]-Castle.gridCursorPosZ) / 7.0 - size / 2.0) + 17;
			Castle.phantomBuildingSize = size;

			Castle.phantomBuildingIsAllowedToBuild = Castle.isBuildingAllowed(Castle.phantomBuilding.posX, Castle.phantomBuilding.posY, size);
		}

	}

	static isBuildingAllowed(posX, posY, size) {
		Castle.UpdateGridImage();
		const posXMax = posX + size - 1;
		const posYMax = posY + size - 1;
		if (posX < 0 || posY < 0) {
			return false;
		}
		if (posXMax > 45 || posYMax > 37) {
			return false;
		}
		// Castle zone
		if (posX < 31 && posY < 3) {
			return false;
		}
		if (posX < 23 && posY < 8) {
			return false;
		}
		if (posX < 22 && posY < 14) {
			return false;
		}
		if (posX < 18 && posY < 17) {
			return false;
		}
		if (posXMax > 9 && posX < 18 && posY == 17) {
			return false;
		}
		// Bottom corner
		if (posXMax > 28 || posYMax > 20) {
			if (45 - posYMax + 37 - posXMax < 17) {
				return false;
			}
		}
		// Left corner
		if (posXMax > 43 || posY < 2) {
			if (45 - posXMax + posY < 2) {
				return false;
			}
		}
		// Right corner
		if (posX < 2 || posYMax > 35) {
			if (posX + 37 - posYMax < 2) {
				return false;
			}
		}
		for (let i = 0; i < size; ++i) {
			for (let j = 0; j < size; ++j) {
				if (Castle.allowedToBuildGrid[posX + i][posY + j]) {
					return false;
				}
			}
		}
		return true;
	}

	static UpdateGridImage() {
		let data = Castle.allowedToBuildGridTex;
		for (let i = 0; i < data.length / 4; ++i) {
			let posX = i % 64;
			let posY = Math.floor(i / 64);
			data[i * 4] = 0;     // R (красный)
			data[i * 4 + 1] = 0;   // G (зеленый)
			data[i * 4 + 2] = 0;   // B (синий)
			data[i * 4 + 3] = 0; // A (альфа, непрозрачность)
			if (posX < 47 && posY < 38) {
				if (Castle.phantomBuilding.id && 
					posX >= Castle.phantomBuilding.posX && posY >= Castle.phantomBuilding.posY &&
					posX < Castle.phantomBuilding.posX + Castle.phantomBuildingSize && posY < Castle.phantomBuilding.posY + Castle.phantomBuildingSize
				) {
					data[i * 4] = Castle.phantomBuildingIsAllowedToBuild ? 0 : 255;     // R (красный)
					data[i * 4 + 1] = Castle.phantomBuildingIsAllowedToBuild ? 255 : 106;   // G (зеленый)
					data[i * 4 + 2] = 0;   // B (синий)
					data[i * 4 + 3] = 255; // A (альфа, непрозрачность)
				}
				if (Castle.allowedToBuildGrid[posX][posY]) {
					data[i * 4] = 255;     // R (красный)
					data[i * 4 + 1] = 0;   // G (зеленый)
					data[i * 4 + 2] = 0;   // B (синий)
					data[i * 4 + 3] = 255; // A (альфа, непрозрачность)
				}
			}
		}
	}

	static UpdateAllowedToBuildGrid() {
		Castle.allowedToBuildGrid = Array.from(Array(47), () => new Array(38));
		for (const placedBuilding of Castle.placedBuildings) {
			const pbSize = Castle.sceneBuildings[Castle.buildings[placedBuilding.id]].size[0];
			for (let i = 0; i < pbSize; ++i) {
				for (let j = 0; j < pbSize; ++j) {
					Castle.allowedToBuildGrid[placedBuilding.posX + i][placedBuilding.posY + j] = 1;
				}
			}
		}
		}


	static placePhantomBuilding() {
		if (Castle.phantomBuildingIsAllowedToBuild) {
			Castle.placedBuildings.push(Object.assign({}, Castle.phantomBuilding));
			Castle.isStaticSMCached = false;
			Castle.WriteBuildings();
		}
	}

	static findAndRotateBuilding(posX, posY) {
		for (let b = 0; b < Castle.placedBuildings.length; ++b) {
			let building = Castle.placedBuildings[b];
			if (building.posX == posX && building.posY == posY) {
				building.rot = (building.rot + 1) % 4;
				Castle.isStaticSMCached = false;
				Castle.WriteBuildings();
				return;
			}
		}
	}

	static findAndDeleteBuilding(posX, posY) {
		for (let b = 0; b < Castle.placedBuildings.length; ++b) {
			let building = Castle.placedBuildings[b];
			if (building.posX == posX && building.posY == posY) {
				Castle.placedBuildings.splice(b, 1);
				Castle.isStaticSMCached = false;
				Castle.WriteBuildings();
				return;
			}
		}
	}

	static GetLauncherFilePath(fileName) {
		const homeDir = NativeAPI.os.homedir();
		let pwcLauncherDir = NativeAPI.path.join(homeDir, 'Prime World Classic');
		return NativeAPI.path.join(pwcLauncherDir, fileName);
	}

	static async ensureCastleFile() {
		const homeDir = NativeAPI.os.homedir();
		let pwcLauncherDir = NativeAPI.path.join(homeDir, 'Prime World Classic');
		let castleFilePath = Castle.GetLauncherFilePath('castle.cfg');
		try {
			await NativeAPI.fileSystem.promises.mkdir(pwcLauncherDir, { recursive: true });
			await NativeAPI.fileSystem.promises.access(castleFilePath);
			return true;
		} catch (e) {
			await Castle.WriteDefaultBuildings();
			return false;
		}
	}

	static async WriteDefaultBuildings() {
		Castle.placedBuildings = JSON.parse(JSON.stringify(Castle.defaultPlacedBuildings));
		await Castle.WriteBuildings();
	}

	static async ReadBuildings() {
		if (!NativeAPI.status) {
			Castle.placedBuildings = Castle.defaultPlacedBuildings;
			Castle.UpdateAllowedToBuildGrid();
			return;
		}

		let castleFilePath = Castle.GetLauncherFilePath('castle.cfg');
		try {
			if (await Castle.ensureCastleFile()) {
				const data = await NativeAPI.fileSystem.promises.readFile(castleFilePath, 'utf-8');
				Castle.placedBuildings = JSON.parse(data);
			}
		} catch (e) {
			Castle.placedBuildings = Castle.defaultPlacedBuildings;
		}
		Castle.UpdateAllowedToBuildGrid();
	}

    static async WriteBuildings() {
        if (!NativeAPI.status) {
			Castle.UpdateAllowedToBuildGrid();
            return;
        }

		let castleFilePath = Castle.GetLauncherFilePath('castle.cfg');
        try {
            await NativeAPI.fileSystem.promises.writeFile(
                castleFilePath,
                JSON.stringify(Castle.placedBuildings, null, 2),
                'utf-8'
            );
        } catch (e) {
            App.error(e);
        }
		Castle.UpdateAllowedToBuildGrid();
    }

	static async loadBuildings() {
        await Castle.ReadBuildings();
		Castle.isBuildingsLoaded = true;
		
        window.addEventListener('beforeunload', () => {
            Castle.WriteBuildings();
        });
	}

	static async initDemo(sceneName, canvas) {

		Castle.currentSceneName = sceneName;

		Castle.shaderFactionDef = sceneName == 'doct' ? "SCENE_DOCT" : "SCENE_AD";

		window.addEventListener('resize', function (event) {

			canvas.width = document.body.offsetWidth;

			canvas.height = document.body.offsetHeight;

			Castle.canvasWidth = canvas.width;

			Castle.canvasHeight = canvas.height;

			Castle.cursorPosition = [Castle.canvasWidth, Castle.canvasHeight];

		}, true);

		canvas.addEventListener('click', function (event) {
			if (Castle.phantomBuilding.id > 0) {
				Castle.placePhantomBuilding();
			} else {
				if (Castle.outlinedBuilding && !Castle.wasMoved) {
					if (Castle.buildMode) {
						Castle.findAndRotateBuilding(Castle.outlinedBuilding.position[0], Castle.outlinedBuilding.position[1]);
					} else {
						if (Castle.outlinedBuilding.name in CastleBuildingsEvents) {
							CastleBuildingsEvents[Castle.outlinedBuilding.name]();
						}
					}
				}
			}
		});

		Castle.globalCanvas = canvas;

		canvas.onwheel = Castle.zoom;

		//var canvas = document.getElementById('game-surface');

		canvas.width = document.body.offsetWidth;

		canvas.height = document.body.offsetHeight;

		canvas.onmousedown = Castle.prepareMove;

		canvas.onmouseup = Castle.stopMove;

		oncontextmenu = (event) => { 
			event.preventDefault();
			Castle.phantomBuilding.id = 0; 
			Castle.phantomBuilding.posX = 0; 
			Castle.phantomBuilding.posY = 1000; 
			if (Castle.buildMode && Castle.outlinedBuilding) {
				Castle.findAndDeleteBuilding(Castle.outlinedBuilding.position[0], Castle.outlinedBuilding.position[1])
			}
		}

		canvas.addEventListener('mousemove', Castle.moveMouse);

		Castle.gl = canvas.getContext('webgl');

		if (!Castle.gl) {
			console.log('WebGL not supported, falling back on experimental-webgl');
			Castle.gl = canvas.getContext('experimental-webgl');
		}

		if (!Castle.gl) {
			console.error('Your browser does not support WebGL');
			return 1;
		}

		Castle.gl.enable(Castle.gl.DEPTH_TEST);
		Castle.gl.enable(Castle.gl.CULL_FACE);
		Castle.gl.frontFace(Castle.gl.CCW);
		Castle.gl.cullFace(Castle.gl.FRONT);

		Castle.viewMatrix = new Float32Array(16);
		Castle.viewMatrix2 = new Float32Array(16);
		Castle.projMatrix = new Float32Array(16);
		Castle.viewProjMatr = new Float32Array(16);
		Castle.flipMatr = new Float32Array([
			-1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		]);
		Castle.canvasWidth = canvas.width;
		Castle.canvasHeight = canvas.height;
		Castle.cursorPosition = [Castle.canvasWidth, Castle.canvasHeight];


		Castle.isSMEnabled = true;

		const ext = Castle.gl.getExtension('WEBGL_depth_texture');

		if (!ext) {

			Castle.isSMEnabled = false;

		}

		if (Castle.isSMEnabled) {
			// Setup matrix. Only one viewProj is needed
			let lightViewMatrix = new Float32Array(16);
			let lightViewMatrix2 = new Float32Array(16);
			let lightProjMatrix = new Float32Array(16);
			Castle.lightViewProjMatrix = new Float32Array(16);
			mat4.ortho(lightProjMatrix, -400, 400, -400, 400, Castle.zNearSM, Castle.zFarSM);

			let smCamParams = [
				{
					name: 'ad',
					camPos: [-1239.6, -151, -1433],
					camRot: [-2.29, 2.813, 3.14]
				},
				{
					name: 'doct',
					camPos: [-1395.8, -291.7, -1338.5],
					camRot: [-2.4, -1.423, 3.14]
				}
			];

			let quatStart = quat.create();
			quat.identity(quatStart);
			let quatX = quat.create();
			let quatY = quat.create();
			let quatZ = quat.create();

			let smCam = smCamParams.find(value => value.name === sceneName);
			quat.rotateX(quatX, quatStart, smCam.camRot[0]);
			quat.rotateY(quatY, quatX, smCam.camRot[1]);
			quat.rotateZ(quatZ, quatY, smCam.camRot[2]);

			mat4.fromRotationTranslation(lightViewMatrix, quatZ, vec3.create());
			mat4.translate(lightViewMatrix, lightViewMatrix, smCam.camPos);
			mat4.multiply(lightViewMatrix2, Castle.flipMatr, lightViewMatrix);
			mat4.multiply(Castle.lightViewProjMatrix, lightProjMatrix, lightViewMatrix2);
			
			Castle.gridTexture = Castle.gl.createTexture();
			Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, Castle.gridTexture);
			Castle.gl.texImage2D(
				Castle.gl.TEXTURE_2D,      // target
				0,                  // mip level
				Castle.gl.RGBA, // internal format
				64,   // width
				64,   // height
				0,                  // border
				Castle.gl.RGBA,
				Castle.gl.UNSIGNED_BYTE,
				null);              // data
			Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_MAG_FILTER, Castle.gl.NEAREST);
			Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_MIN_FILTER, Castle.gl.NEAREST);
			Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_WRAP_S, Castle.gl.CLAMP_TO_EDGE);
			Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_WRAP_T, Castle.gl.CLAMP_TO_EDGE);

			// Setup textures
			Castle.depthTexture = Castle.gl.createTexture();
			Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, Castle.depthTexture);
			Castle.gl.texImage2D(
				Castle.gl.TEXTURE_2D,      // target
				0,                  // mip level
				Castle.gl.DEPTH_COMPONENT, // internal format
				Castle.depthTextureSize,   // width
				Castle.depthTextureSize,   // height
				0,                  // border
				Castle.gl.DEPTH_COMPONENT, // format
				Castle.gl.UNSIGNED_INT,    // type
				null);              // data
			Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_MAG_FILTER, Castle.gl.NEAREST);
			Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_MIN_FILTER, Castle.gl.NEAREST);
			Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_WRAP_S, Castle.gl.REPEAT);
			Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_WRAP_T, Castle.gl.REPEAT);

			Castle.depthFramebuffer = Castle.gl.createFramebuffer();
			Castle.gl.bindFramebuffer(Castle.gl.FRAMEBUFFER, Castle.depthFramebuffer);
			Castle.gl.framebufferTexture2D(
				Castle.gl.FRAMEBUFFER,       // target
				Castle.gl.DEPTH_ATTACHMENT,  // attachment point
				Castle.gl.TEXTURE_2D,        // texture target
				Castle.depthTexture,         // texture
				0);                   // mip level

			const unusedTexture = Castle.gl.createTexture();
			Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, unusedTexture);
			Castle.gl.texImage2D(
				Castle.gl.TEXTURE_2D,
				0,
				Castle.gl.RGBA,
				Castle.depthTextureSize,
				Castle.depthTextureSize,
				0,
				Castle.gl.RGBA,
				Castle.gl.UNSIGNED_BYTE,
				null,
			);
			Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_MAG_FILTER, Castle.gl.NEAREST);
			Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_MIN_FILTER, Castle.gl.NEAREST);
			Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_WRAP_S, Castle.gl.REPEAT);
			Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_WRAP_T, Castle.gl.REPEAT);

			// attach it to the framebuffer
			Castle.gl.framebufferTexture2D(
				Castle.gl.FRAMEBUFFER,        // target
				Castle.gl.COLOR_ATTACHMENT0,  // attachment point
				Castle.gl.TEXTURE_2D,         // texture target
				unusedTexture,         // texture
				0);                  // mip level

		}

		let shaderNames = [], texNames = [];
		Castle.sceneBuildings = new Object;

		let sceneMeshesToLoadCount = -1; // Initial value. Scene must have objects

		let result = await HTTP.request('content/scenes.json');

		Castle.scenesJson = result;

		Castle.currentScene = result.scenes.find(value => value.sceneName === sceneName);

		sceneMeshesToLoadCount = Castle.currentScene.objects.length + Castle.currentScene.buildings.length; // Set scene objects count to some valid value

		let loadedBuildings = [];

		loadedBuildings.push(Castle.currentScene.buildings);

		for (let obj of Castle.currentScene.objects) {

			Castle.sceneObjects.push({
				meshName: obj.mesh, meshData: {}, shader: obj.shader, shaderId: {}, blend: obj.blend,
				tintColor: obj.tintColor, uvScale: obj.uvScale, uvScroll: obj.uvScroll,
				texture: obj.texture, texture_2: obj.texture_2, texture_3: obj.texture_3, texture_4: obj.texture_4,
				textureId: {}, texture2Id: {}, texture3Id: {}, texture4Id: {}, strip: obj.strip, transform: obj.transform, indexCount: obj.indexCount
			});

			Castle.loadObjectResources(shaderNames, texNames, obj);

			sceneMeshesToLoadCount--; // Decrement after each loaded object

		}

		Castle.identityMatrix = new Float32Array(16);

		mat4.identity(Castle.identityMatrix);

		for (let building of Castle.currentScene.buildings) {

			let buildingTranslation = building.translation ? building.translation : [0, 0];

			for (let obj of building.objects) {

				obj.transform[3] -= buildingTranslation[0];

				obj.transform[11] -= buildingTranslation[1];

				if (!(building.name in Castle.sceneBuildings)) {

					Castle.sceneBuildings[building.name] = { size: building.size, objects: [], transparentObjects: [] };

				}

				let selectedContainer = obj.blend ? Castle.sceneBuildings[building.name].transparentObjects : Castle.sceneBuildings[building.name].objects;

				selectedContainer.push({
					meshName: obj.mesh, meshData: {}, shader: obj.shader, shaderId: {}, blend: obj.blend,
					tintColor: obj.tintColor, uvScale: obj.uvScale, uvScroll: obj.uvScroll,
					texture: obj.texture, texture_2: obj.texture_2, texture_3: obj.texture_3, texture_4: obj.texture_4,
					textureId: {}, texture2Id: {}, texture3Id: {}, texture4Id: {}, strip: obj.strip, transform: obj.transform, indexCount: obj.indexCount
				});

				Castle.loadObjectResources(shaderNames, texNames, obj);

			}

			sceneMeshesToLoadCount--;

		}




		await Castle.loadResources(Castle.sceneObjects, Castle.sceneBuildings, shaderNames, texNames);

		//var canvas = globalCanvas; //document.getElementById('game-surface');

		Castle.globalCanvas.classList.add('castle-fade-in');

		if (NativeAPI.fileSystem && !('castle' in Sound.all)) {
			var soundFiles = NativeAPI.fileSystem.readdirSync('content/sounds/' + sceneName);

			let playCastleMusic = function () {
				let musicName = 'content/sounds/' + sceneName + '/' + soundFiles[Math.floor(Math.random() * soundFiles.length)];
				Sound.stop('castle');
				Sound.play(musicName, { id: 'castle', volume: Castle.GetVolume(Castle.AUDIO_MUSIC) }, playCastleMusic)

			}
			playCastleMusic();
		}

		Castle.loadBuildings();

		Castle.MainLoop(Castle.sceneObjects, Castle.sceneBuildings, Castle.sceneShaders, Castle.sceneTextures);

	}

	static loadObjectResources(shaderNames, texNames, obj) {

		shaderNames.push(obj.shader);

		texNames.push(obj.texture);

		if (obj.texture_2) {

			texNames.push(obj.texture_2);

		}

		if (obj.texture_3) {

			texNames.push(obj.texture_3);

		}

		if (obj.texture_4) {

			texNames.push(obj.texture_4);

		}

	}

	static uniformLocationCache = new Object();
	static getUniformLocation(program, name) {
		if (program.progId in this.uniformLocationCache) {
			if (name in this.uniformLocationCache[program.progId]) {
				return this.uniformLocationCache[program.progId][name];
			}
		} else {
			this.uniformLocationCache[program.progId] = new Object();
		}
		let uniformLocation = Castle.gl.getUniformLocation(program.prog, name);
		this.uniformLocationCache[program.progId][name] = uniformLocation;
		return uniformLocation;
	}

	static async loadResources(sceneObjects, sceneBuildings, notUniqeShaderNames, notUniqeTexNames) {
		let shaderNames = [...new Set(notUniqeShaderNames)];
		let texNames = [...new Set(notUniqeTexNames)];

		function remapIndices(sceneObjectsContainer, objId) {
			sceneObjectsContainer[objId].shaderId = shaderNames.findIndex(value => value === sceneObjectsContainer[objId].shader);
			sceneObjectsContainer[objId].textureId = texNames.findIndex(value => value === sceneObjectsContainer[objId].texture);
			sceneObjectsContainer[objId].texture2Id = texNames.findIndex(value => value === sceneObjectsContainer[objId].texture_2);
			sceneObjectsContainer[objId].texture3Id = texNames.findIndex(value => value === sceneObjectsContainer[objId].texture_3);
			sceneObjectsContainer[objId].texture4Id = texNames.findIndex(value => value === sceneObjectsContainer[objId].texture_4);
		}

		for (var objId = 0; objId < sceneObjects.length; objId++) {
			remapIndices(sceneObjects, objId);
		}
		for (let b in Castle.sceneBuildings) {
			let building = Castle.sceneBuildings[b].objects;
			for (objId = 0; objId < building.length; ++objId) {
				remapIndices(building, objId);
			}

			let buildingTransp = Castle.sceneBuildings[b].transparentObjects;
			for (objId = 0; objId < buildingTransp.length; ++objId) {
				remapIndices(buildingTransp, objId);
			}
		}

		Castle.sceneTextures = new Array(texNames.length);
		let loaded = { mesh: 0, texture: 0, shader: 0 };

		Castle.sceneShaders = new Array(shaderNames.length);

		let vsText = await HTTP.request(`content/shaders/shader.vs.glsl`, 'text');

		let fsText = await HTTP.request(`content/shaders/shader.fs.glsl`, 'text');

		for (let i = 0; i < shaderNames.length; ++i) {

			let definesText = await HTTP.request(`content/shaders/${shaderNames[i]}.glsl`, 'text');

			let programColor = Castle.prepareShader(`\n#define RENDER_PASS_COLOR\n #define ${Castle.shaderFactionDef}`, definesText, vsText, fsText);

			let programSM = Castle.prepareShader(`\n#define RENDER_PASS_SM\n #define ${Castle.shaderFactionDef}`, definesText, vsText, fsText);

			Castle.sceneShaders[i] = { PSO: programColor, PSO_SM: programSM, attributes: Castle.scenesJson.shaderLayouts.find(value => value.name === shaderNames[i]).layout, vertStride: 0 };

			loaded.shader++;

		}

		for (let i = 0; i < texNames.length; ++i) {

			Castle.sceneTextures[i] = Castle.loadTexture(await PreloadImages.loadAsync(`content/textures/${texNames[i]}.webp`));

			loaded.texture++;

		}

		for (let i = 0; i < sceneObjects.length; ++i) {

			await Castle.loadMesh(shaderNames, sceneObjects, i);

			loaded.mesh++;

		}

		let totalMeshes = Castle.sceneObjects.length;

		for (let buildingMain in Castle.sceneBuildings) {

			let building = Castle.sceneBuildings[buildingMain].objects;

			for (let objId = 0; objId < building.length; ++objId) {

				await Castle.loadMesh(shaderNames, building, objId);

			}

			totalMeshes += building.length;

			let buildingTransp = Castle.sceneBuildings[buildingMain].transparentObjects;

			for (let objId = 0; objId < buildingTransp.length; ++objId) {

				await Castle.loadMesh(shaderNames, buildingTransp, objId);

			}

			totalMeshes += buildingTransp.length;

		}

	}

	static uniqueProgCounter = 0;

	static shaderFactionDef = "INVALID_DEFINE"

	static prepareShader(renderPassDefine, definesText, vsText, fsText) {

		let vertexShader = Castle.gl.createShader(Castle.gl.VERTEX_SHADER), fragmentShader = Castle.gl.createShader(Castle.gl.FRAGMENT_SHADER);

		Castle.gl.shaderSource(vertexShader, definesText + renderPassDefine + vsText);

		Castle.gl.shaderSource(fragmentShader, definesText + renderPassDefine + fsText);

		Castle.gl.compileShader(vertexShader);

		if (!Castle.gl.getShaderParameter(vertexShader, Castle.gl.COMPILE_STATUS)) {

			console.error('ERROR compiling vertex shader!', Castle.gl.getShaderInfoLog(vertexShader));

			return 1;

		}

		Castle.gl.compileShader(fragmentShader);

		if (!Castle.gl.getShaderParameter(fragmentShader, Castle.gl.COMPILE_STATUS)) {

			console.error('ERROR compiling fragment shader!', Castle.gl.getShaderInfoLog(fragmentShader));

			return 1;

		}
		//console.log('Loaded shader ' + shaderNames[shaderId]);
		let program = {prog: Castle.gl.createProgram(), progId: this.uniqueProgCounter++};

		Castle.gl.attachShader(program.prog, vertexShader);

		Castle.gl.attachShader(program.prog, fragmentShader);

		Castle.gl.linkProgram(program.prog);

		if (!Castle.gl.getProgramParameter(program.prog, Castle.gl.LINK_STATUS)) {

			console.error('ERROR linking program!', Castle.gl.getProgramInfoLog(program.prog));

			return 1;

		}

		Castle.gl.validateProgram(program.prog);

		if (!Castle.gl.getProgramParameter(program.prog, Castle.gl.VALIDATE_STATUS)) {

			console.error('ERROR validating program!', Castle.gl.getProgramInfoLog(program.prog));

			return 1;

		}

		return program;

	}

	static lerp(a, b, alpha) {
		return a + alpha * (b - a);
	}
	static clamp(val, min, max) {
		return Math.min(Math.max(val, min), max)
	}

	static loadTexture(image) {

		let texture = Castle.gl.createTexture();

		Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, texture);

		Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_WRAP_S, Castle.gl.REPEAT);

		Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_WRAP_T, Castle.gl.REPEAT);

		Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_MIN_FILTER, Castle.gl.LINEAR);

		Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_MAG_FILTER, Castle.gl.LINEAR);

		Castle.gl.texImage2D(Castle.gl.TEXTURE_2D, 0, Castle.gl.RGBA, Castle.gl.RGBA, Castle.gl.UNSIGNED_BYTE, image);

		Castle.gl.generateMipmap(Castle.gl.TEXTURE_2D);

		return texture;

	}

	static async loadMesh(shaderNames, sceneObjectsContainer, objectId) {

		let meshData = await HTTP.request(`content/meshes/${sceneObjectsContainer[objectId].meshName}`, 'arrayBuffer');

		let vertices = Castle.gl.createBuffer();

		let meshFloat = new Float32Array(meshData);

		Castle.gl.bindBuffer(Castle.gl.ARRAY_BUFFER, vertices);

		Castle.gl.bufferData(Castle.gl.ARRAY_BUFFER, meshFloat, Castle.gl.STATIC_DRAW);

		let attributes = Castle.scenesJson.shaderLayouts.find(value => value.name === shaderNames[sceneObjectsContainer[objectId].shaderId]).layout;

		let vertStride = 0;

		for (let attribute of attributes) {

			vertStride += attribute.count * attribute.sizeElem;

		}

		let indexCount = meshFloat.length / (vertStride / 4);

		if (indexCount != sceneObjectsContainer[objectId].indexCount) {

			console.error('Fatal error getting index count (' + meshName + ')');

		}

		sceneObjectsContainer[objectId].meshData = { vertices: vertices, vertStride: vertStride, indexCount: meshFloat.length / (vertStride / 4) };

		//console.log('Loaded mesh ' + meshName);

	}

	static MainLoop(sceneObjects, sceneBuildings, sceneShaders, sceneTextures) {

		if (Castle.sceneBuildings) {
			var gridBuilding = Castle.sceneBuildings['grid'];

			var gridTransform = gridBuilding.transparentObjects[0].transform;

			Castle.gridTranslation = [gridTransform[3], gridTransform[11]];

		} else {
			Castle.gridTranslation = [0, 0];
		}
		requestAnimationFrame(Castle.loop);
	}

	static loop() {

		let isStopRender = Castle.render.includes(false);
		if (isStopRender) {
			requestAnimationFrame(Castle.loop);
			return;
		}

		Castle.prevTime = Castle.currentTime;

		Castle.currentTime = (Date.now() - Castle.loadTime) / 1000.0;

		Castle.deltaTime = Castle.currentTime - Castle.prevTime;

		// Update cam behaviour

		let factor = Castle.clamp(Castle.cameraAnimationSpeed * Castle.deltaTime, 0, 1);

		Castle.currentFixedValue = Castle.lerp(Castle.currentFixedValue, Castle.targetFixedValue, factor);

		let targetFovs = [Castle.fixedFovValues[Math.round(Castle.initialFixedValue)], Castle.fixedFovValues[Math.round(Castle.targetFixedValue)]];

		let targetRots = [Castle.fixedRotationTiltValues[Math.round(Castle.initialFixedValue)], Castle.fixedRotationTiltValues[Math.round(Castle.targetFixedValue)]];

		let targetCHVs = [Castle.fixedCameraHeightValues[Math.round(Castle.initialFixedValue)], Castle.fixedCameraHeightValues[Math.round(Castle.targetFixedValue)]];

		let camLerp = Math.abs(Castle.initialFixedValue - Castle.currentFixedValue);

		Castle.fov = Castle.lerp(targetFovs[0], targetFovs[1], camLerp);

		Castle.rotationTilt = Castle.lerp(targetRots[0], targetRots[1], camLerp);

		Castle.cameraHeight = Castle.lerp(targetCHVs[0], targetCHVs[1], camLerp);

		let buildingsToDraw = [];

		for (let building of Castle.placedBuildings) {
			var mesh = Castle.sceneBuildings[Castle.buildings[building.id]];
			buildingsToDraw.push({
				mesh: mesh, rotation: building.rot * 1.57, position: [building.posX, building.posY], name: Castle.buildings[building.id],
				translation: [Castle.zeroTranslation[0] + (building.posX * 7.0 + mesh.size[0] / 2.0 * 7.0), 1, Castle.zeroTranslation[1] + ((building.posY-17) * 7.0 + mesh.size[1] / 2.0 * 7.0)]
			});
		}
		if (Castle.buildMode && Castle.phantomBuilding.id > 0) {
			var mesh = Castle.sceneBuildings['grid'];
			buildingsToDraw.push({
				mesh: mesh, rotation: 0, position: [0, 0], name: 'grid',
				translation: [Castle.zeroTranslation[0] + (mesh.size[0] / 2.0 * 7.0), 1, Castle.zeroTranslation[1] + (mesh.size[1] / 2.0 * 7.0)]
			});
		}

		Castle.updateMainCam();

		let outlinedBuilding = -1;
		Castle.outlinedBuilding = null;
		if (Object.keys(Window.windows).length === 0) { // do not outline when any window is active
			if (Castle.phantomBuilding.id > 0) {
				let building = Castle.phantomBuilding;
				var mesh = Castle.sceneBuildings[Castle.buildings[building.id]];
				buildingsToDraw.push({
					outlined: true, mesh: mesh, rotation: building.rot * 1.57, position: [building.posX, building.posY], name: Castle.buildings[building.id],
					translation: [Castle.zeroTranslation[0] + (building.posX * 7.0 + mesh.size[0] / 2.0 * 7.0), 1, Castle.zeroTranslation[1] + ((building.posY-17) * 7.0 + mesh.size[1] / 2.0 * 7.0)]
				});
				outlinedBuilding = buildingsToDraw.length - 1;
			} else {
				for (let i = 0; i < buildingsToDraw.length; ++i) {
					let building = buildingsToDraw[i];
					let shift = [Castle.zeroTranslation[0] + Castle.gridTranslation[0], Castle.zeroTranslation[1] + Castle.gridTranslation[1]];
					if (shift[0] - Castle.gridCursorPosX > building.translation[0] - building.mesh.size[0] / 2 * 7 && shift[0] - Castle.gridCursorPosX < building.translation[0] + building.mesh.size[1] / 2 * 7 &&
						shift[1] - Castle.gridCursorPosZ > building.translation[2] - building.mesh.size[1] / 2 * 7 && shift[1] - Castle.gridCursorPosZ < building.translation[2] + building.mesh.size[1] / 2 * 7 &&
						(buildingsToDraw[i].name in CastleBuildingsEvents || Castle.buildMode)
					) {
						outlinedBuilding = i;
						Castle.outlinedBuilding = buildingsToDraw[outlinedBuilding];
						break;
					}
				}
			}
		}

		if (Castle.isSMEnabled && !Castle.isStaticSMCached && Castle.sceneObjects && Castle.isBuildingsLoaded) {
			Castle.gl.bindFramebuffer(Castle.gl.FRAMEBUFFER, Castle.depthFramebuffer);
			Castle.gl.viewport(0, 0, Castle.depthTextureSize, Castle.depthTextureSize);
			Castle.gl.clear(Castle.gl.COLOR_BUFFER_BIT | Castle.gl.DEPTH_BUFFER_BIT);

			for (let i = 0; i < Castle.sceneObjects.length; ++i) {
				let obj = Castle.sceneObjects[i];
				if (obj.blend)
					break;
				Castle.prepareAndDrawObject(obj, true);
			}
			for (let buildingToDraw of buildingsToDraw) {
				for (let i = 0; i < buildingToDraw.mesh.objects.length; ++i) {
					if (!buildingToDraw.outlined) {
						Castle.prepareAndDrawObject(buildingToDraw.mesh.objects[i], true, buildingToDraw.rotation, buildingToDraw.translation);
					}
				}
			}
			Castle.isStaticSMCached = true;
		}

		Castle.gl.bindFramebuffer(Castle.gl.FRAMEBUFFER, null);
		Castle.gl.viewport(0, 0, Castle.gl.canvas.width, Castle.gl.canvas.height);
		Castle.gl.clearColor(0.75, 0.85, 0.8, 1.0);
		Castle.gl.clear(Castle.gl.COLOR_BUFFER_BIT | Castle.gl.DEPTH_BUFFER_BIT);

		if (Castle.sceneObjects) {
			let blendsFrom;
			for (let i = 0; i < Castle.sceneObjects.length; ++i) {
				if (Castle.sceneObjects[i].blend) {
					blendsFrom = i;
					break;
				}
				Castle.prepareAndDrawObject(Castle.sceneObjects[i], false);
			}

			if (outlinedBuilding >= 0) {
				Castle.gl.disable(Castle.gl.DEPTH_TEST);
				Castle.gl.depthMask(false);
				let buildingToDraw = buildingsToDraw[outlinedBuilding];
				let outlineColor = Castle.BUILDING_OUTLINE_GOOD;
				if (Castle.buildMode) {
					outlineColor = Castle.BUILDING_OUTLINE_SELECTION;
					if (Castle.phantomBuilding.id > 0) {
						outlineColor =  Castle.phantomBuildingIsAllowedToBuild ? Castle.BUILDING_OUTLINE_GOOD : Castle.BUILDING_OUTLINE_BAD;;
					}
				}
				for (let i = 0; i < buildingToDraw.mesh.objects.length; ++i) {
					let outlinedTranslation = [buildingToDraw.translation[0], buildingToDraw.translation[1], buildingToDraw.translation[2]];
					outlinedTranslation[1] -= 6.0 / buildingToDraw.mesh.size[0];
					Castle.prepareAndDrawObject(buildingToDraw.mesh.objects[i], false, buildingToDraw.rotation, outlinedTranslation, outlineColor, 1.0 + (0.16 / Math.pow(buildingToDraw.mesh.size[0], 3/4)));
				}
				Castle.gl.enable(Castle.gl.DEPTH_TEST);
				Castle.gl.depthMask(true);
			}

			for (let buildingToDraw of buildingsToDraw) {
				for (let i = 0; i < buildingToDraw.mesh.objects.length; ++i) {
					Castle.prepareAndDrawObject(buildingToDraw.mesh.objects[i], false, buildingToDraw.rotation, buildingToDraw.translation);
				}
			}

			for (let i = blendsFrom; i < Castle.sceneObjects.length; ++i) {
				Castle.prepareAndDrawObject(Castle.sceneObjects[i], false);
			}

			for (let buildingToDraw of buildingsToDraw) {
				for (let i = 0; i < buildingToDraw.mesh.transparentObjects.length; ++i) {
					Castle.prepareAndDrawObject(buildingToDraw.mesh.transparentObjects[i], false, buildingToDraw.rotation, buildingToDraw.translation);
				}
			}
		}
		Castle.gl.disable(Castle.gl.BLEND);
		Castle.gl.enable(Castle.gl.CULL_FACE);
		Castle.gl.colorMask(true, true, true, true);
		Castle.gl.depthMask(true);

		Castle.cursorDeltaPos[0] = 0;
		Castle.cursorDeltaPos[1] = 0;

		requestAnimationFrame(Castle.loop);

	}

	static prepareAndDrawObject(obj, isSMPass, rotation, translation, tintOverride, scaleOverride) {

		let meshData = obj.meshData;
		let associatedTexture = obj.textureId;
		let associatedTexture2 = obj.texture2Id;
		let associatedTexture3 = obj.texture3Id;
		let associatedTexture4 = obj.texture4Id;
		let associatedShader = Castle.sceneShaders[obj.shaderId];

		let textures = [Castle.sceneTextures[associatedTexture],
		associatedTexture2 ? Castle.sceneTextures[associatedTexture2] : {},
		associatedTexture3 ? Castle.sceneTextures[associatedTexture3] : {},
		associatedTexture4 ? Castle.sceneTextures[associatedTexture4] : {}];
		let uvScroll = [0.0, 0.0];

		if (obj.uvScroll) {
			uvScroll[0] = obj.uvScroll[0] * Castle.currentTime;
			uvScroll[1] = obj.uvScroll[1] * Castle.currentTime;
		}

		Castle.drawObject(isSMPass ? associatedShader.PSO_SM : associatedShader.PSO,
			textures, meshData.vertices, meshData.indexCount,
			meshData.vertStride, Castle.sceneShaders[obj.shaderId].attributes,
			obj.strip, obj.transform, isSMPass,
			obj.blend, obj.tintColor, obj.uvScale, uvScroll, rotation, translation, tintOverride, scaleOverride, obj.meshName == 'grid_9_01.bin');

	}

	static updateMainCam() {

		mat4.perspective(Castle.projMatrix, glMatrix.toRadian(Castle.fov), Castle.canvasWidth / Castle.canvasHeight, Castle.zNear, Castle.zFar);

		var camPosElements = [-1432, -440, -1582];

		var camPosX = camPosElements[0] + Castle.camDeltaPos[0];

		var camPosY = camPosElements[2] - Castle.camDeltaPos[1];

		var camPosZ = camPosElements[1] + Castle.cameraHeight;

		var camPos = vec3.fromValues(camPosX, camPosZ, camPosY);

		var camForwElements = [-2.170, -2.36, 3.14];

		var quatStart = quat.create();

		quat.identity(quatStart);

		var quatX = quat.create();

		var quatY = quat.create();

		var quatZ = quat.create();

		quat.rotateX(quatX, quatStart, camForwElements[0] + Castle.rotationTilt);

		quat.rotateY(quatY, quatX, camForwElements[1]);

		quat.rotateZ(quatZ, quatY, camForwElements[2]);

		mat4.fromRotationTranslation(Castle.viewMatrix, quatZ, vec3.create());

		mat4.translate(Castle.viewMatrix, Castle.viewMatrix, camPos);

		mat4.multiply(Castle.viewMatrix2, Castle.flipMatr, Castle.viewMatrix);

		mat4.multiply(Castle.viewProjMatr, Castle.projMatrix, Castle.viewMatrix2);

		var camForw = [Castle.viewMatrix2[2], Castle.viewMatrix2[6], Castle.viewMatrix2[10], 0];

		var camForwXY = [camForw[0], camForw[2]];

		vec2.normalize(camForwXY, camForwXY);

		var camRight = [Castle.viewMatrix2[0], Castle.viewMatrix2[4], Castle.viewMatrix2[8], 0];

		var camRightXY = [camRight[0], camRight[2]];

		vec2.normalize(camRightXY, camRightXY);

		Castle.camDeltaPos[0] -= (camForwXY[1] * Castle.cursorDeltaPos[0] - camRightXY[1] * Castle.cursorDeltaPos[1]) * 0.1;

		Castle.camDeltaPos[1] -= (camForwXY[0] * Castle.cursorDeltaPos[0] - camRightXY[0] * Castle.cursorDeltaPos[1]) * 0.1;

		Castle.camDeltaPos[0] = Castle.clamp(Castle.camDeltaPos[0], Castle.camDeltaPosMinMax[0][0], Castle.camDeltaPosMinMax[0][1]);

		Castle.camDeltaPos[1] = Castle.clamp(Castle.camDeltaPos[1], Castle.camDeltaPosMinMax[1][0], Castle.camDeltaPosMinMax[1][1]);

		mat4.invert(Castle.viewProjInv, Castle.viewProjMatr); // viewProj -> world

		Castle.cursorBasis = [((Castle.cursorPosition[0] - Castle.canvasWidth / 2) / Castle.canvasWidth * 2), -((Castle.cursorPosition[1] - Castle.canvasHeight / 2) / Castle.canvasHeight * 2), 1, 1];

		vec4.transformMat4(Castle.cursorBasis2, Castle.cursorBasis, Castle.viewProjInv);

		Castle.cursorBasis2[0] /= -Castle.cursorBasis2[3];

		Castle.cursorBasis2[1] /= -Castle.cursorBasis2[3];

		Castle.cursorBasis2[2] /= -Castle.cursorBasis2[3];

		var camForwNew = [Castle.cursorBasis2[0] - camPos[0], Castle.cursorBasis2[1] - camPos[1], Castle.cursorBasis2[2] - camPos[2]];

		vec3.normalize(camForwNew, camForwNew);

		var t = -(camPos[1] + 27) / camForwNew[1];

		Castle.gridCursorPosX = camPos[0] + t * camForwNew[0] + (Castle.zeroTranslation[0] + Castle.gridTranslation[0]);

		Castle.gridCursorPosZ = camPos[2] + t * camForwNew[2] + (Castle.zeroTranslation[1] + Castle.gridTranslation[1]);

	}
	static setupMainCam(program) {

		let matViewProjUniformLocation = Castle.getUniformLocation(program, 'mViewProj');

		Castle.gl.uniformMatrix4fv(matViewProjUniformLocation, Castle.gl.FALSE, Castle.viewProjMatr);

		let matViewProjSMUniformLocation = Castle.getUniformLocation(program, 'lightViewProj');

		Castle.gl.uniformMatrix4fv(matViewProjSMUniformLocation, Castle.gl.FALSE, Castle.lightViewProjMatrix);

		let zNearFar = Castle.getUniformLocation(program, 'zNear_zFar');

		Castle.gl.uniform4f(zNearFar, Castle.zNear, Castle.zFar, Castle.zNearSM, Castle.zFarSM);

		let cursorGridPosition = Castle.getUniformLocation(program, 'cursorGridPosition');

		Castle.gl.uniform2f(cursorGridPosition, -Castle.gridCursorPosX, -Castle.gridCursorPosZ);

	}

	static setupSMCam(program) {

		let matViewProjUniformLocation = Castle.getUniformLocation(program, 'mViewProj');

		Castle.gl.uniformMatrix4fv(matViewProjUniformLocation, Castle.gl.FALSE, Castle.lightViewProjMatrix);

	}

	static getBlendFunc(blendString) {

		switch (blendString) {

			case "ZERO": return Castle.gl.ZERO; break;

			case "ONE": return Castle.gl.ONE; break;

			case "SRC_COLOR": return Castle.gl.SRC_COLOR; break;

			case "ONE_MINUS_SRC_COLOR": return Castle.gl.ONE_MINUS_SRC_COLOR; break;

			case "DST_COLOR": return Castle.gl.DST_COLOR; break;

			case "ONE_MINUS_DST_COLOR": return Castle.gl.ONE_MINUS_DST_COLOR; break;

			case "SRC_ALPHA": return Castle.gl.SRC_ALPHA; break;

			case "ONE_MINUS_SRC_ALPHA": return Castle.gl.ONE_MINUS_SRC_ALPHA; break;

			case "DST_ALPHA": return Castle.gl.DST_ALPHA; break;

			case "ONE_MINUS_DST_ALPHA": return Castle.gl.ONE_MINUS_DST_ALPHA; break;

			case "CONSTANT_COLOR": return Castle.gl.CONSTANT_COLOR; break;

			case "ONE_MINUS_CONSTANT_COLOR": return Castle.gl.ONE_MINUS_CONSTANT_COLOR; break;

			case "CONSTANT_ALPHA": return Castle.gl.CONSTANT_ALPHA; break;

			case "ONE_MINUS_CONSTANT_ALPHA": return Castle.gl.ONE_MINUS_CONSTANT_ALPHA; break;

			case "SRC_ALPHA_SATURATE": return Castle.gl.SRC_ALPHA_SATURATE; break;

			default: return Castle.gl.ONE; break;

		}

	}

	static drawObject(program, textures, vertices, indexCount, vertStride, attributes, strip, transform, isSMPass, blend, tintColor, uvScale, uvScroll, rotation, translation, tintOverride, scaleOverride, isGrid) {

		if (blend) {

			Castle.gl.enable(Castle.gl.BLEND);

			Castle.gl.disable(Castle.gl.CULL_FACE);

			Castle.gl.blendEquation(Castle.gl.FUNC_ADD);

			Castle.gl.colorMask(true, true, true, false);

			Castle.gl.depthMask(false);

			Castle.gl.blendFunc(Castle.getBlendFunc(blend[0]), Castle.getBlendFunc(blend[1]));

		}

		Castle.gl.bindBuffer(Castle.gl.ARRAY_BUFFER, vertices);

		let attribOffset = 0;

		for (let attribute of attributes) {

			let attribLocation = Castle.gl.getAttribLocation(program.prog, attribute.name);

			let attribType = attribute.sizeElem == 4 ? Castle.gl.FLOAT : (attribute.sizeElem == 2 ? Castle.gl.UNSIGNED_SHORT : Castle.gl.UNSIGNED_BYTE);

			Castle.gl.vertexAttribPointer(
				attribLocation, // Attribute location
				attribute.count, // Number of elements per attribute
				attribType, // Type of elements
				Castle.gl.TRUE,
				vertStride, // Size of an individual vertex
				attribOffset // Offset from the beginning of a single vertex to this attribute
			);

			Castle.gl.enableVertexAttribArray(attribLocation);

			attribOffset += attribute.count * attribute.sizeElem;

		}

		Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, null);
		// Tell OpenGL state machine which program should be active.
		Castle.gl.useProgram(program.prog);

		isSMPass ? Castle.setupSMCam(program) : Castle.setupMainCam(program);

		let tintColorValue = tintOverride ? tintOverride : (tintColor ? tintColor : [1, 1, 1, 1]);

		let tintColorLocation = Castle.getUniformLocation(program, 'tintColor');

		Castle.gl.uniform4fv(tintColorLocation, tintColorValue);

		let uvScaleValue = uvScale ? uvScale : [1, 1, 1, 1];

		let uvScaleLocation = Castle.getUniformLocation(program, 'uvScale');

		Castle.gl.uniform4fv(uvScaleLocation, uvScaleValue);

		if (uvScroll[0] > 0) {

			let e = 1;

		}

		let uvScrollValue = uvScroll ? uvScroll : [0, 0];

		let uvScrollLocation = Castle.getUniformLocation(program, 'uvScroll');

		Castle.gl.uniform2fv(uvScrollLocation, uvScrollValue);

		let worldMatrix = transform ? transform : new Float32Array([
			1, 0, 0, 0,
			0, 0, 1, 0,
			0, -1, 0, 0,
			0, 0, 0, 1
		]);

		var worldMatrix2 = new Float32Array(16);

		var worldMatrix3 = new Float32Array(16);

		mat4.transpose(worldMatrix2, worldMatrix);

		if (rotation) {

			mat4.fromRotation(worldMatrix3, rotation, [0, 1, 0]);

			mat4.mul(worldMatrix2, worldMatrix3, worldMatrix2);

		}

		if (scaleOverride) {

			mat4.fromScaling(worldMatrix3, [scaleOverride, scaleOverride, scaleOverride]);

			mat4.mul(worldMatrix2, worldMatrix3, worldMatrix2);
		}

		if (translation) {

			worldMatrix2[12] += translation[0];

			worldMatrix2[13] += translation[1];

			worldMatrix2[14] += translation[2];

		}

		let matWorldUniformLocation = Castle.getUniformLocation(program, 'mWorld');

		Castle.gl.uniformMatrix4fv(matWorldUniformLocation, Castle.gl.FALSE, worldMatrix2);

		for (let i = 0; i < textures.length; ++i) {

			if (textures[i]) {

				Castle.gl.activeTexture(Castle.gl.TEXTURE0 + i);

				Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, textures[i]);

				let attribName = "tex" + i;

				let texLocation = Castle.getUniformLocation(program, attribName);

				Castle.gl.uniform1i(texLocation, i);

			}

		}

		if (!isSMPass) {

			Castle.gl.activeTexture(Castle.gl.TEXTURE0 + textures.length);

			Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, Castle.depthTexture);

			let attribNameSM = "smTexture";

			let texLocationSM = Castle.getUniformLocation(program, attribNameSM);

			Castle.gl.uniform1i(texLocationSM, textures.length);

		}

		if (!isSMPass && isGrid) {
			Castle.gl.activeTexture(Castle.gl.TEXTURE0 + textures.length + 1);

			Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, Castle.gridTexture);
			Castle.gl.texImage2D(Castle.gl.TEXTURE_2D, 0, Castle.gl.RGBA, 64, 64, 0, Castle.gl.RGBA, Castle.gl.UNSIGNED_BYTE, Castle.allowedToBuildGridTex);

			let attribNameSM = "gridTex";

			let texLocationSM = Castle.getUniformLocation(program, attribNameSM);

			Castle.gl.uniform1i(texLocationSM, textures.length + 1);
			
		}

		Castle.gl.drawArrays(strip ? Castle.gl.TRIANGLE_STRIP : Castle.gl.TRIANGLES, 0, indexCount);

	}

}

class Settings {
    static defaultSettings = {
        fullscreen: true,
        render: true,
        globalVolume: 0.5,
        musicVolume: 0.7,
        soundsVolume: 0.7,
		radminPriority: false,
		language: 'ru',
		novoice: false
    };

    static settings = JSON.parse(JSON.stringify(this.defaultSettings));
    static pwcLauncherSettingsDir;
    static settingsFilePath;

    static async ensureSettingsFile() {
        const homeDir = NativeAPI.os.homedir();
        this.pwcLauncherSettingsDir = NativeAPI.path.join(homeDir, 'Prime World Classic');
        this.settingsFilePath = NativeAPI.path.join(this.pwcLauncherSettingsDir, 'launcher.cfg');

        try {
            await NativeAPI.fileSystem.promises.mkdir(this.pwcLauncherSettingsDir, { recursive: true });
            await NativeAPI.fileSystem.promises.access(this.settingsFilePath);
            return true;
        } catch (e) {
            App.error('Ошибка доступа к файлу настроек: ' + e);
            await this.writeDefaultSettings();
            return false;
        }
    }

    static async writeDefaultSettings() {
        this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
        await this.WriteSettings();
    }

    static async ReadSettings() {
        if (!NativeAPI.status) {
            App.error('NativeAPI не инициализирован! Используются настройки по умолчанию');
            this.settings = { ...this.defaultSettings };
            return;
        }

        try {
            if (await this.ensureSettingsFile()) {
                const data = await NativeAPI.fileSystem.promises.readFile(this.settingsFilePath, 'utf-8');
                this.settings = { ...this.defaultSettings, ...JSON.parse(data) };
            }
        } catch (e) {
            App.error('Ошибка чтения настроек: ' + e);
            this.settings = { ...this.defaultSettings };
        }
    }

    static async WriteSettings() {
        if (!this.settingsFilePath || !NativeAPI.status) {
            App.error('Не могу сохранить настройки: путь или NativeAPI недоступны');
            return;
        }
        
        try {
            await NativeAPI.fileSystem.promises.writeFile(
                this.settingsFilePath,
                JSON.stringify(this.settings, null, 2),
                'utf-8'
            );
        } catch (e) {
            App.error('Ошибка сохранения настроек: ' + e);
        }
    }
	
	// Инициализация глобальных горячих клавиш
    static initGlobalHotkeys() {
        console.log('Initializing global hotkeys...');
        
        document.addEventListener('keydown', (e) => {
            // F11 - переключение полноэкранного режима
            if (e.key === 'F11') {
                e.preventDefault();
                e.stopPropagation();
                this.toggleFullscreen();
            }
        });
        
        console.log('Global hotkeys initialized - F11 for fullscreen toggle');
    }

    // Метод для переключения полноэкранного режима
    static toggleFullscreen() {
        if (!this.settings) {
            console.warn('Settings not initialized');
            return;
        }
        
        this.settings.fullscreen = !this.settings.fullscreen;
        console.log(`Toggling fullscreen: ${this.settings.fullscreen ? 'ON' : 'OFF'}`);
        
        // Применяем настройки
        this.ApplySettings({render: false, audio: false});
        
        // Синхронизируем UI если открыты настройки
        this.syncFullscreenUI();
        
        // Показываем уведомление пользователю
        this.showFullscreenNotification();
    }

    // Синхронизация UI чекбокса
    static syncFullscreenUI() {
        const fullscreenToggle = document.getElementById('fullscreen-toggle');
        if (fullscreenToggle) {
            fullscreenToggle.checked = !this.settings.fullscreen;
            console.log('Updated fullscreen toggle UI');
        }
    }

    // Показать уведомление о переключении режима
    static showFullscreenNotification() {
        if (typeof App !== 'undefined' && App.notify) {
            const message = this.settings.fullscreen ? 
                (Lang.text('fullscreenEnabled') || 'Fullscreen enabled') : 
                (Lang.text('fullscreenDisabled') || 'Window mode enabled');
            App.notify(message);
        }
    }

    static async ApplySettings(options = {}) {
		// Установка значений по умолчанию для options
		options = {
			render: true,    // Применять настройки рендеринга по умолчанию
			audio: true,     // Применять настройки звука по умолчанию
			window: true,    // Применять настройки окна по умолчанию
			...options       // Переопределение дефолтных значений
		};
	
		try {
			// 1. Применение настроек рендеринга (если не отключено в options)
			if (options.render !== false && typeof Castle !== 'undefined') {
				Castle.toggleRender(Castle.RENDER_LAYER_PLAYER, this.settings.render);
			}
	
			// 2. Применение настроек окна (если не отключено в options)
			if (options.window !== false && NativeAPI.status && NativeAPI.window) {
				const currentMode = await NativeAPI.window.isFullscreen;
				if (this.settings.fullscreen && !currentMode) {
					await NativeAPI.window.enterFullscreen();
				} else if (!this.settings.fullscreen && currentMode) {
					await NativeAPI.window.leaveFullscreen();
					NativeAPI.window.resizeTo(1280, 720);
					NativeAPI.window.setPosition('center');
				}
			}
	
			// 3. Применение настроек звука (если не отключено в options)
			if (options.audio !== false && typeof Sound !== 'undefined') {
				// Обновляем громкость для всех звуков
				for (const soundId in Sound.all) {
					const type = soundId === 'castle' ? Castle.AUDIO_MUSIC : Castle.AUDIO_SOUNDS;
					Sound.setVolume(soundId, Castle.GetVolume(type));
				}
				
				// Специальная обработка тестового звука (если используется)
				if (Castle.testSoundIsPlaying && Sound.all.sound_test) {
					Sound.setVolume('sound_test', Castle.GetVolume(Castle.AUDIO_SOUNDS));
				}
			}
			// 4. Применение настроек языка (если не отключено в options)
			if (options.language !== false && typeof Lang !== 'undefined') {
            // Обновляем текущий язык
            if (this.settings.language && this.settings.language in Lang.list) {
                Lang.target = this.settings.language;
            }
        }
	
		} catch (e) {
			App.error('Ошибка применения настроек: ' + e);
		}
	}

    static async init() {
        await this.ReadSettings();
        await this.ApplySettings();
        
		// Инициализируем глобальные горячие клавиши
        this.initGlobalHotkeys();
		
        window.addEventListener('beforeunload', () => {
            this.WriteSettings();
        });
    }
}

class MM {

	static id = '';

	static hero = false;
	
	static targetBanHeroId = 0;

	static view = document.createElement('div');

	static button = DOM({ tag: 'div' }, DOM({ tag: 'div' }), DOM({ id: 'MMQueue' }, '0'));

	static renderBody = false;

	static active = false;

	static targetPlayerAnimate = false;

	static activeSelectHero = 0;

	static gameRunEvent() {
		Castle.toggleRender(Castle.RENDER_LAYER_GAME, false);
		Castle.toggleMusic(Castle.MUSIC_LAYER_GAME, false);
		document.body.style.display = 'none';
		NativeAPI.window.hide();

		NativeAPI.app.unregisterGlobalHotKey(NativeAPI.altEnterShortcut);
	}

	static gameStopEvent() {
		Castle.toggleRender(Castle.RENDER_LAYER_GAME, true);
		Castle.toggleMusic(Castle.MUSIC_LAYER_GAME, true);
		document.body.style.display = 'block';
		
		if (NativeAPI.status) {
			try {
				Settings.ApplySettings();
				
				NativeAPI.window.show();
				NativeAPI.app.registerGlobalHotKey(NativeAPI.altEnterShortcut);
			} catch (e) {
				App.error(e);
			}
		}
		
		View.show('castle');
	}

	static initView() {
		
		MM.view.classList.add('mm');

		MM.view.style.display = 'none';

		document.body.append(MM.view);

		let button = CastleNAVBAR.init();

		button.onclick = () => MM.start();
	}

	static async init() {

		MM.initView();

		// Linux test
		//let testRun = DOM({style:'castle-button-play-test'}, "Test");
		//CastleNAVBAR.body.append(testRun);

		//testRun.onclick = () => PWGame.start("Tester00Tester00Tester00Tester004c8fa55b5ee54d6ddbaab2373f8a6a74d7f9c5d739bdd79da12f3beda73c7115", MM.gameStopEvent);

		Timer.init();

		window.addEventListener('beforeunload', () => {

			if (NativeAPI.status) {

				// Stop MM search
				if (MM.active) {

					MM.start();

				}

			}

		});

	}

	static soundEvent() {

		Sound.play('content/sounds/found.ogg', { id: 'MM_found', volume: Castle.GetVolume(Castle.AUDIO_SOUNDS) });

	}

	static play() {

		return MM.button;

	}

	static show(content) {

		if (MM.view.firstChild) {

			while (MM.view.firstChild) {

				MM.view.firstChild.remove();

			}

		}

		MM.view.append(content);

		MM.view.style.display = 'flex';

	}

	static close() {

		Sound.stop('tambur');

		Castle.toggleMusic(Castle.MUSIC_LAYER_TAMBUR, true);

		MM.view.style.display = 'none';

	}

	static searchActive(status = true) {

		if ((status) && (!MM.active)) {

			MM.active = true;

			//MM.buttonAnimate = MM.button.animate({opacity:[1,0.5,1]},{duration:1000,iterations:Infinity,easing:'ease-out'});

			//MM.button.firstChild.innerText = 'Поиск боя';

			CastleNAVBAR.play();

		}

		if ((!status) && (MM.active)) {

			MM.active = false;

			CastleNAVBAR.cancel();

			/*
			if(MM.buttonAnimate){
				
				MM.buttonAnimate.cancel();
				
			}
			
			MM.button.firstChild.innerText = Lang.text('fight');
			*/

		}

	}

	static async gameStartCheck() {

		if (PWGame.gameConnectionTestIsActive) {

			return;

		}

		if (!PWGame.gameServerHasConnection || !PWGame.isUpToDate || !PWGame.isValidated) {

			MM.button.firstChild.innerText = 'Проверка';

		}

		try {

			if (!MM.active) {

				PWGame.gameConnectionTestIsActive = true;

				await PWGame.check();

				await PWGame.testGameServerConnection();

				await PWGame.checkUpdates();

				PWGame.gameConnectionTestIsActive = false;

			}

		}
		catch (error) {

			PWGame.gameConnectionTestIsActive = false;

			if (!PWGame.gameServerHasConnection || !PWGame.isUpToDate || !PWGame.isValidated) { // Неудача

				MM.button.firstChild.innerText = Lang.text('fight');

			}

			return App.error(error);

		}

	}

	static async start() {

		if (NativeAPI.status) {

			await MM.gameStartCheck();

		}
		else {

			const downloadMessage = DOM({
				tag: 'p',
				innerHTML: 'Загрузите и установите последнюю Windows версию <a href="https://pw.26rus-game.ru/" class="launcher-link">лаунчера</a> всего один раз, теперь вам не нужно будет делать лишних действий по обновлению игры, лаунчер все сделает автоматически.'
			});

			const splashContent = DOM({ 
				style: 'splash-content-window' 
			});

			const heading = DOM({ tag: 'h1' }, 'Необходима Windows версия лаунчера!');
			const paragraph1 = DOM({ tag: 'p' }, 'Мы отказались от поиска боя и запуска игры Prime World через браузер, так как у игроков регулярно возникали с этим проблемы.');
			const paragraph2 = DOM({ tag: 'p' }, 'Мы полностью перенесли браузерный лаунчер в полноценное Windows приложение с автоматическим обновлением клиентской части Prime World.');

			// Создаем кнопку закрытия
			const closeButton = DOM({
				tag: 'div',
				style: 'close-button',
				event: ['click', () => Splash.hide()]
			});
			closeButton.style.backgroundImage = 'url(content/icons/close-cropped.svg)';

			splashContent.append(closeButton, heading, paragraph1, paragraph2, downloadMessage);

			// Добавляем стили для ссылки
			const style = DOM({
				tag: 'style',
				innerHTML: `
					.launcher-link {
						color: #ff0000;
						text-decoration: none;
						transition: color 0.3s ease;
					}
					.launcher-link:hover {
						color: #ff6666;
						text-decoration: underline;
					}
				`
			});
			document.head.append(style);

			Splash.show(splashContent, false);
			return;

		}

		if (!MM.hero) {

			MM.hero = await App.api.request('build', 'heroAll');

		}

		if (MM.active) {

			try {

				await App.api.request(CURRENT_MM, 'cancel');

			}
			catch (error) {

				return App.error(error);

			}

			MM.searchActive(false);

		}
		else {

			MM.searchActive(true);

			try {

				let request = await App.api.request(CURRENT_MM, 'start', { hero: MM.activeSelectHero, version: PW_VERSION, mode: CastleNAVBAR.mode, mac: NativeAPI.getMACAdress() });
				
				CastleNAVBAR.division(request.division);
				
				CastleNAVBAR.karma(request.karma);
				
				if (request.type == 'reconnect') {

					MM.searchActive(false);

					MM.gameRunEvent();

					PWGame.reconnect(request.id, MM.gameStopEvent);

					return;

				}

			}
			catch (error) {

				MM.searchActive(false);

				return App.error(error);

			}

		}

	}

	static async ready(data) {

		MM.id = data.id;

		let body = DOM({ style: 'mm-ready' }, Timer.body, DOM({ id: `MMReady`, style: 'mm-ready-count' }, `0/${data.limit}`));

		await Timer.start(data.id, 'Бой найден', () => {

			MM.close();

			MM.searchActive(true);

		});

		MM.searchActive(false);

		MM.soundEvent();

		let button = DOM({
			style: 'ready-button', event: ['click', async () => {
				
				try{
					
					Voice.destroy();
					
				}
				catch(error){
					
					console.log(error);
					
				}

				try {
					
					await App.api.request(CURRENT_MM, 'ready', { id: data.id });

				}
				catch (error) {

					Timer.stop();

					MM.close();

					MM.searchActive(false);

					return;

				}

				button.style.opacity = 0;

			}]
		}, Lang.text('ready'));


		button.style.fontSize = '2cqw';

		button.animate({ transform: ['scale(1)', 'scale(0.8)', 'scale(1.2)', 'scale(1)'] }, { duration: 500, iterations: Infinity, easing: 'ease-in-out' });

		body.append(button);

		MM.show(body);

	}

	static async lobbyBuildView(heroId) {

		if (MM.lobbyBuildField.firstChild) {

			MM.lobbyBuildField.firstChild.remove();

		}

		while (MM.lobbyBuildTab.firstChild) {

			MM.lobbyBuildTab.firstChild.remove();

		}

		let builds = await App.api.request('build', 'my', { hero: heroId });
		
		let target = 0;

		for (let build of builds) {

			let tab = DOM({
				event: ['click', async () => {

					await App.api.request('build', 'target', { id: build.id });
					
					target = build.id;

					for (let child of MM.lobbyBuildTab.children) {

						child.style.background = 'rgba(255,255,255,0)';

					}

					tab.style.background = 'rgba(255,255,255,0.3)';

					if (MM.lobbyBuildField.firstChild) {

						MM.lobbyBuildField.firstChild.remove();

					}

					MM.lobbyBuildField.append(Build.viewModel(build.body, false, false));

				}]
			}, build.name);

			if (build.target) {
				
				target = build.id;

				tab.style.background = 'rgba(255,255,255,0.3)';

				if (MM.lobbyBuildField.firstChild) {

					MM.lobbyBuildField.firstChild.remove();

				}

				MM.lobbyBuildField.append(Build.viewModel(build.body, false, false));

			}

			MM.lobbyBuildTab.append(tab);

		}
		
		let notify = true, random = DOM({style:'ready-button',event:['click', async () => {
			
			if(notify){
				
				random.innerText = 'Перезаписать текущий билд?';
				
				notify = false;
				
				return;
				
			}
			
			random.innerText = 'Генерация...';
			
			let build = await App.api.request('build', 'rebuild', { id: target });
			
			if (MM.lobbyBuildField.firstChild) {
				
				MM.lobbyBuildField.firstChild.remove();
				
			}
			
			MM.lobbyBuildField.append(Build.viewModel(build.body, false, false));
			
			notify = true;
			
			for (let item of builds) {
				
				if(item.id == target){
					
					item.body = build.body;
					
				}
				
			}
			
			random.innerText = 'Случайный билд';
			
		}]},'Случайный билд');
		
		random.style.width = 'auto';
		
		MM.lobbyBuildTab.append(random);
		
	}

	static async lobby(data) {

		if (!MM.hero) {

			MM.hero = await App.api.request('build', 'heroAll');

		}

		if (!MM.id) {

			MM.id = data.id;

		}

		MM.searchActive(false);

		MM.lobbyUsers = data.users;

		MM.targetHeroId = data.users[App.storage.data.id].hero;

		let lobbyBuild = DOM({ style: 'mm-lobby-middle-build' });

		MM.lobbyBuildField = DOM();

		MM.lobbyBuildField.style.margin = '0.5cqw 0';

		MM.lobbyBuildField.style.width = '28cqw';

		MM.lobbyBuildField.style.height = '28cqw';

		MM.lobbyBuildTab = DOM({ style: 'lobby-build-tab' });

		MM.lobbyConfirm = DOM({
			style: 'ready-button', event: ['click', async () => {

				try {

					await App.api.request(CURRENT_MM, 'hero', { id: data.id, heroId: MM.targetHeroId, banHeroId: MM.targetBanHeroId });
					
				}
				catch (error) {

					MM.lobbyConfirm.innerText = error;

					setTimeout(() => {

						MM.lobbyConfirm.innerText = 'Подтвердить';
						
					}, 1500);
					
				}

			}]
		}, 'Подтвердить');

		MM.lobbyConfirm.style.opacity = 0;

		MM.lobbyConfirm.style.width = '50%';

		MM.lobbyConfirm.animate({ transform: ['scale(1)', 'scale(0.8)', 'scale(1.2)', 'scale(1)'] }, { duration: 2000, iterations: Infinity, easing: 'ease-in-out' });

		lobbyBuild.append(MM.lobbyConfirm, MM.lobbyBuildField, MM.lobbyBuildTab);

		if (MM.targetHeroId) {

			MM.lobbyBuildView(MM.targetHeroId);

		}

		let leftTeam = DOM({ style: 'mm-lobby-header-team' });

		let rightTeam = DOM({ style: 'mm-lobby-header-team' });

		for (let key of data.map) {

			let player = DOM({ id: `PLAYER${key}`, style: 'mm-lobby-header-team-player' });

			player.dataset.hero = data.users[key].hero;

			let hero = DOM({ style: 'mm-lobby-header-team-player-hero' });

			let name = DOM({ style: 'mm-lobby-header-team-player-name' }, `${data.users[key].nickname}`);

			let rankIcon = DOM({ style: 'rank-icon' });

			rankIcon.style.backgroundImage = `url(content/ranks/${Rank.icon(data.users[key].rating)}.webp)`;

			let rank = DOM({ style: 'rank' }, DOM({ style: 'rank-lvl' }, data.users[key].rating), rankIcon);

			hero.append(rank);

			if ('commander' in data.users[key]) {

				hero.append(DOM({ style: `mm-status-commander-${Winrate.icon(data.users[key].winrate)}` }));

				name.setAttribute('style', 'color:rgba(255,215,0,0.9)');
				
			}
			
			let banhero = DOM({style:'mm-player-ban'});
			
			if(data.users[key].banhero){
				
				banhero.style.backgroundImage = `url(content/hero/${data.users[key].banhero}/1.webp)`
				
				banhero.style.display = 'block';
				
			}
			
			hero.append(banhero);

			hero.style.backgroundImage = (data.users[key].hero) ? `url(content/hero/${data.users[key].hero}/1.webp)` : `url(content/hero/empty.webp)`;

			player.append(hero, name);

			if (key == data.target) {

				MM.lobbyPlayerAnimate = player.animate({ transform: ['scale(1)', 'scale(0.8)', 'scale(1.1)', 'scale(1)'] }, { duration: 2000, iterations: Infinity, easing: 'ease-in-out' });
				
			}

			if (data.users[App.storage.data.id].team == data.users[key].team) {

				leftTeam.append(player);

				player.onclick = () => {

					if (player.dataset.hero) {

						Build.view(key, player.dataset.hero, data.users[key].nickname, false);

					}

				}

			}
			else {

				name.innerText = 'ifst';

				name.style.opacity = 0;

				rankIcon.style.backgroundImage = 'none';

				rank.firstChild.innerText = 1100;

				rank.firstChild.style.opacity = 0;

				rightTeam.append(player);

			}

		}

		MM.lobbyHeroes = DOM({ style: 'mm-lobby-middle-hero' },DOM({style:'mm-lobby-middle-hero-prompt'},'ЛКМ (ВЫБРАТЬ) / ПКМ (ЗАБЛОКИРОВАТЬ)'));

		//let preload = new PreloadImages(MM.lobbyHeroes);

		let activeRankName = '';

		for (let item of MM.hero) {
			
			if(!item.id){
				
				continue;
				
			}
			
			if( ('hero' in data) && (data.hero.length) ){
				
				if(!data.hero.includes(`${item.id}`)){
					
					continue;
					
				}
				
			}

			let getRankName = Rank.getName(item.rating);

			if (getRankName != activeRankName) {

				let rankIcon = DOM({ style: 'mm-lobby-middle-hero-line-icon' });

				rankIcon.style.backgroundImage = `url(content/ranks/${Rank.icon(item.rating)}.webp)`;

				let rankIcon2 = DOM({ style: 'mm-lobby-middle-hero-line-icon' });

				rankIcon2.style.backgroundImage = `url(content/ranks/${Rank.icon(item.rating)}.webp)`;

				MM.lobbyHeroes.append(DOM({ style: 'mm-lobby-middle-hero-line' }, rankIcon, DOM({ style: 'mm-lobby-middle-hero-line-name' }, getRankName), rankIcon2));

				activeRankName = getRankName;

			}

			let hero = DOM({ id: `HERO${item.id}`, data: { ban: 0 }, style: 'mm-lobby-middle-hero-item' });

			hero.style.backgroundImage = `url("content/hero/${item.id}/1.webp")`;

			hero.onclick = async () => {

				MM.targetHeroId = item.id;

				await App.api.request(CURRENT_MM, 'eventChangeHero', { id: MM.id, heroId: item.id });

				MM.lobbyBuildView(MM.targetHeroId);
				
			}
			
			hero.oncontextmenu = async () => {
				
				await App.api.request(CURRENT_MM, 'eventBanHero', { id: MM.id, heroId: item.id });
				
				MM.targetBanHeroId = item.id;
				
			}

			let rank = DOM({ style: 'rank' }, DOM({ style: 'rank-lvl' }, item.rating));

			hero.append(rank);

			MM.lobbyHeroes.append(hero);

			//preload.add(hero);

		}


		if (App.storage.data.id == data.target) {

			MM.lobbyConfirm.style.opacity = 1;

		}

		let info = DOM({ style: 'lobby-timer' });

		await Timer.start(data.id, '', () => {

			MM.close();

			MM.searchActive(true);

		});

		info.append(Timer.body);

		MM.chatBody = DOM({ style: 'mm-lobby-middle-chat-body' });

		let chatInput = DOM({ tag: 'input', style: 'mm-lobby-middle-chat-button', placeholder: Lang.text('enterTextAndPressEnter') })

		chatInput.addEventListener('keyup', async (event) => {

			if (event.code === 'Enter') {

				if (chatInput.value.length < 2) {

					throw 'Количество символов < 2';

				}

				if (chatInput.value.length > 256) {

					throw 'Количество символов > 256';

				}

				await App.api.request(CURRENT_MM, 'chat', { id: MM.id, message: chatInput.value });

				chatInput.value = '';

			}

		});

		let body = DOM({ style: 'mm-lobby' }, DOM({ style: 'mm-lobby-header' }, leftTeam, info, rightTeam), DOM({ style: 'mm-lobby-middle' }, DOM({ style: 'mm-lobby-middle-chat' }, DOM({ style: 'mm-lobby-middle-chat-map' }, (data.mode == 0) ? MM.renderMap(data.users[App.storage.data.id].team) : DOM()), MM.chatBody, chatInput), lobbyBuild, MM.lobbyHeroes));

		Sound.play('content/sounds/tambur.ogg', { id: 'tambur', volume: Castle.GetVolume(Castle.AUDIO_MUSIC), loop: true });

		Castle.toggleMusic(Castle.MUSIC_LAYER_TAMBUR, false);

		MM.show(body);

		for (let key in data.users) {

			if (!data.users[key].hero) {

				continue;
				
			}

			let findHero = document.getElementById(`HERO${data.users[key].hero}`);

			if (findHero) {

				findHero.style.filter = 'grayscale(100%)';

				findHero.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';

				findHero.dataset.ban = key;
				
			}
			
			if(data.users[key].banhero){
				
				let findHero = document.getElementById(`HERO${data.users[key].banhero}`);
				
				if (findHero) {
					
					findHero.style.filter = 'grayscale(100%)';
					
					findHero.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
					
				}
				
			}
			
		}
		
		try{
			
			let list = new Array();
			
			for(let key of data.map){
				
				if(data.users[App.storage.data.id].team == data.users[key].team){
					
					list.push({id:key,name:data.users[key].nickname});
					
				}
				
			}
			
			Voice.association(App.storage.data.id,list,data.id);
			
		}
		catch(error){
			
			console.log('Voice.association',error);
			
		}
		
	}

	static renderMap(team) {

		MM.renderBody = DOM({ style: (team == 1) ? 'map' : 'map-reverse' });

		let container = DOM({ tag: 'div' }, MM.renderBody);

		container.setAttribute('style', 'width:37cqh;height:37cqh');

		for (let number of [1, 2, 3, 4, 5, 6]) {

			let item = DOM({
				style: `map-item-${number}`, data: { player: 0, position: number }, event: ['click', async () => {

					await App.api.request(CURRENT_MM, 'position', { id: MM.id, position: (item.dataset.player == App.storage.data.id) ? 0 : item.dataset.position });
					

				}]
			})

			MM.renderBody.append(item);
			
		}
		
		return container;

	}

	static async select(data) {

		Sound.play(`content/hero/${data.heroId}/revive/${data.sound}.ogg`, { 
			id: `heroSound_${data.heroId}_${data.sound}`,
			volume: Castle.GetVolume(Castle.AUDIO_SOUNDS) 
		});

		MM.lobbyPlayerAnimate.cancel();

		await Timer.start(data.id, '', () => {

			MM.close();

			MM.searchActive(true);

		});

		let findOldPlayer = document.getElementById(`PLAYER${data.userId}`);

		if (findOldPlayer) {

			findOldPlayer.dataset.hero = data.heroId;

			findOldPlayer.firstChild.style.backgroundImage = `url(content/hero/${data.heroId}/1.webp)`;

			findOldPlayer.firstChild.firstChild.firstChild.innerText = data.rating;

			findOldPlayer.firstChild.firstChild.lastChild.style.backgroundImage = `url(content/ranks/99.png)`;
			
			if(data.banHeroId){
				
				findOldPlayer.firstChild.lastChild.style.backgroundImage = `url(content/hero/${data.banHeroId}/1.webp)`;
				
				findOldPlayer.firstChild.lastChild.style.display = 'block';
				
			}
			else{
				
				findOldPlayer.firstChild.lastChild.style.display = 'none';
				
			}
			
		}

		if (data.target != 0) {

			let findPlayer = document.getElementById(`PLAYER${data.target}`);

			if (findPlayer) {

				MM.lobbyPlayerAnimate = findPlayer.animate({ transform: ['scale(1)', 'scale(0.8)', 'scale(1.2)', 'scale(1)'] }, { duration: 500, iterations: Infinity, easing: 'ease-in-out' });
				
			}

		}

		for (let child of MM.lobbyHeroes.children) {

			if (child.dataset.ban == data.userId) {

				child.dataset.ban = 0;

				child.style.filter = 'none';

				child.style.backgroundColor = 'rgba(255, 255, 255, 0)';

				break;
				
			}

		}

		let findHero = document.getElementById(`HERO${data.heroId}`);

		if (findHero) {

			findHero.style.filter = 'grayscale(100%)';

			findHero.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';

			findHero.onclick = false;
			
			findHero.oncontextmenu = false;
			
		}
		
		if(data.banHeroId){
			
			let findHero = document.getElementById(`HERO${data.banHeroId}`);
			
			if (findHero) {
				
				findHero.style.filter = 'grayscale(100%)';
				
				findHero.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
				
				findHero.onclick = false;
				
				findHero.oncontextmenu = false;
				
			}
			
		}

		if (App.storage.data.id == data.target) {

			MM.lobbyConfirm.style.opacity = 1;
			
		}
		else {

			MM.lobbyConfirm.style.opacity = 0;
			
		}
		
	}

	static finish(data) {
		Timer.stop();
		MM.close();
	
		try {
			Settings.ApplySettings();
		} catch (e) {
			App.error(e);
		}
		/*
		if (data.mode == 3) {
			ARAM.briefing(data.hero, data.role, () => {
				MM.gameRunEvent();
				PWGame.start(data.key, MM.gameStopEvent);
			});
		} else {
			MM.gameRunEvent();
			PWGame.start(data.key, MM.gameStopEvent);
		}
		*/
		
		MM.gameRunEvent();
		
		PWGame.start(data.key, MM.gameStopEvent);
		
	}

	static eventChangeHero(data) {

		let findPlayer = document.getElementById(`PLAYER${data.id}`);

		let url = `url(content/hero/${data.heroId}/1.webp)`;

		if (findPlayer) {

			findPlayer.dataset.hero = data.heroId;

			findPlayer.firstChild.style.backgroundImage = url;

			findPlayer.firstChild.firstChild.firstChild.innerText = data.rating;

			findPlayer.firstChild.firstChild.lastChild.style.backgroundImage = `url(content/ranks/${Rank.icon(data.rating)}.webp)`;

		}

		if (MM.renderBody) {

			for (let item of MM.renderBody.children) {

				if (item.dataset.player == data.id) {

					item.style.backgroundImage = url;

					break;
					
				}
				
			}
			
		}
		
	}

	static eventBanHero(data){

		let findPlayer = document.getElementById(`PLAYER${data.id}`);
		
		if(findPlayer){
			
			findPlayer.firstChild.lastChild.style.backgroundImage = `url(content/hero/${data.heroId}/1.webp)`;
			
			findPlayer.firstChild.lastChild.style.display = 'block';
			
		}
		
	}

	static chat(data) {

		let message = DOM(`${data.message}`);

		if (App.isAdmin(data.id)) {

			message.style.color = 'rgba(255, 50, 0, 0.9)';
			
		}
		else if ( (data.id) && ('commander' in MM.lobbyUsers[data.id]) ) {

			message.style.color = 'rgba(255,215,0,0.9)';
			
		}
		
		let item = DOM({ style: 'mm-lobby-middle-chat-body-item' });
		
		if(data.id){
			
			item.append(DOM({tag:'div'},`${MM.lobbyUsers[data.id].nickname}:`));
			
		}
		
		item.append(message);

		MM.chatBody.append(item);

		item.scrollIntoView({ block: 'end', behavior: 'smooth' });
		
	}

}

class ARAM {
	
	static role = {
		1:{name:'Защитник',description:'Прорвать оборону противника и недопустить подхода вражеских героев к более уязвимым союзникам вашей команды.'},
		2:{name:'Штурмовик',description:'Поддержать прорыв обороны противника и недопустить подхода вражеских героев к более уязвимым союзникам вашей команды.'},
		3:{name:'Верховный повелитель',description:'Нанести основной урон вражеской команде и соблюдать дистанцию между противниками, чтобы исключить их подход близко к вам.'},
		4:{name:'Младший повелитель',description:'Нанести основной урон вражеской команде и соблюдать дистанцию между противниками, чтобы исключить их подход близко к вам.'},
		5:{name:'Поддержка',description:'Не допустить ослабления героев союзной команды и любой ценой быть готовым спасти каждого из них.'},
		6:{name:'Преследователь',description:'Найти уязвимых героев вражеской команды для нанесения урона с целью ослабления роли противника или его уничтожения.'},
		7:{name:'Стрелок',description:'Нанести урон по более уязвимым героям вражеской команды и соблюдать дистанцию между противниками, чтобы исключить их подход близко к вам.'}	
	};
	
	static briefing(heroId, roleId, callback) {

		let hero = DOM({ style: 'aram-briefing-left' }, DOM({ style: 'aram-random' }));
		
		hero.style.backgroundImage = `url(content/hero/empty.webp)`;

		let lastRandomHero = 0, second = 17, timer = DOM({ style: 'aram-timer' }, 'Начало боя через 15...');

		let setIntervalId = setInterval(() => {

			if (second <= 5) {

				clearInterval(setIntervalId);

				hero.style.backgroundImage = `url(content/hero/${heroId}/1.webp)`;

				Sound.play(`content/hero/${heroId}/revive/${App.getRandomInt(1, 4)}.ogg`, { volume: Castle.GetVolume(Castle.AUDIO_SOUNDS) });

				hero.firstChild.animate({ opacity: [1, 0] }, { duration: 5000, fill: 'forwards', easing: 'ease-out' });

				// hero.animate({ backgroundSize: ['100%', '125%'] }, { duration: 1500, fill: 'forwards', easing: 'ease-in' });

				return;

			}

			let heroRandom = 0;

			while (true) {

				heroRandom = App.getRandomInt(1,65);

				if (heroRandom != lastRandomHero) {

					lastRandomHero = heroRandom;

					break;

				}

			}

			hero.style.backgroundImage = `url(content/hero/${heroRandom}/1.webp)`;

		}, 150);

		let timerId = setInterval(() => {

			if (second == 0) {

				clearInterval(timerId);

				return;
				
			}

			second--;

			timer.innerText = (second == 0) ? Lang.text('fight') : `Начало боя через ${second}...`;
			
		}, 1000);
		
		let part = DOM({style:'aram-background-part'});
		
		part.style.backgroundImage = `url(content/img/aram/part.png)`;
		
		part.style.backdropFilter = 'blur(5vmax)';
		
		//let text = DOM({style:'aram-text'},DOM({style:'aram-text-center'},DOM({tag:'div'},DOM({tag:'h1'},`Ваша роль — ${ARAM.role[roleId].name}`)),DOM({tag:'div'},ARAM.role[roleId].task)));
		let h1 = DOM({tag:'h1'},'Без права на ошибку');
		let text = DOM({tag:'div'},'Одна ошибка в ARAM — равномерна гибели всей команды. Восстановить запас здоровья или энергии героя на главной базе нельзя.');
		let bodyText = DOM({style:'aram-text'},DOM({style:'aram-text-center'},h1,text));
		
		setTimeout(() => {
			
			let animate = bodyText.animate({ opacity: [0,1] }, { duration: 1650, fill: 'forwards', easing: 'ease-out' });
			
			animate.onfinish = () => {
				
				setTimeout(() => {
					
					animate.reverse();
					
					animate.onfinish = () => {
						
						h1.innerText = `Ваша роль
						${ARAM.role[roleId].name}`;
						
						text.innerText = '';
						
						animate.onfinish = () => {
							
							animate.onfinish = () => {
								
								h1.innerText = 'Ваша задача';
								text.innerText = ARAM.role[roleId].description;
								
								animate.reverse();
								
								animate.onfinish = () => {
									
									animate.reverse();
									
									animate.onfinish = null;
									
								};
								
							};
							
							animate.reverse();
							
						};
						
						animate.reverse();
						
					};
					
				},1000);
				
			}
			
		},1000);
		
		let background = DOM({ style: 'aram-background' },part,hero,bodyText); // content
		
		background.style.backgroundImage = `url(content/img/aram/bg.png)`;

		//timer.animate({ transform: ['scale(1)', 'scale(1.1)', 'scale(1)'] }, { duration: 1000, iterations: Infinity, easing: 'ease-out' });

		setTimeout(() => {
			
			let animate = part.animate({ backdropFilter: ['blur(5vmax)', 'blur(0)'] }, { duration: 5000, fill: 'forwards', easing: 'ease-in-out' });
			
			animate.onfinish = () => {
				
				part.style.display = 'none';
				
				setTimeout(() => {
					
					background.animate({ transform: ['scale(1)', 'scale(1.9)'] }, { duration: 1000, easing: 'ease-out', fill: 'forwards' });
					
					setTimeout(() => {
						
						Castle.toggleMusic(Castle.MUSIC_LAYER_TAMBUR, true);
						
						callback();
						
						Splash.hide();
						
					},4000);
					
					
				},500);
				
			}
			
		},7500);

		Castle.toggleMusic(Castle.MUSIC_LAYER_TAMBUR, false);

		Sound.play('content/sounds/aram/bg.mp3', { id: 'backgroundAram', volume: Castle.GetVolume(Castle.AUDIO_MUSIC) });

		Splash.show(background, false);

	}

}

class Sound {

	static all = new Object();

	static play(source, object = new Object(), callback) {

		if (('id' in object) && (object.id)) {

			if (object.id in Sound.all) {

				Sound.stop(object.id);

			}

		}

		let audio = new Audio();

		if ('loop' in object) {

			audio.loop = object.loop ? true : false;

		}

		audio.preload = 'auto';

		audio.src = source;

		audio.play();

		if (callback) {


			audio.addEventListener("ended", (event) => {
				callback();
			});

		}

		if (('id' in object) && (object.id)) {

			if (!(object.id in Sound.all)) {

				Sound.all[object.id] = audio;

			}

			if ('volume' in object) {
				Sound.setVolume(object.id, object.volume);
			}

		}

	}

	static stop(id) {

		if (id in Sound.all) {

			Sound.all[id].pause();

			delete Sound.all[id];

		}

	}

	static setVolume(id, volume) {

		if (id in Sound.all) {

			Sound.all[id].volume = volume;

		}
	}

	static pause(id) {
		if (id in Sound.all) {
			Sound.all[id].pause();
		}
	}
	static unpause(id) {
		if (id in Sound.all) {
			Sound.all[id].play();
		}
	}

}

class Timer {

	static intervalId = false;

	static init() {

		Timer.sb = DOM(`${name} 00:00`);

		Timer.body = DOM({ style: 'mm-timer' }, Timer.sb);

	}

	static async start(id, name, callback) {

		Timer.stop();

		Timer.callback = callback;

		Timer.message = name;

		Timer.timeFinish = await App.api.request(CURRENT_MM, 'getTimer', { id: id, time: Date.now() });

		if (Timer.end()) {

			return;

		}

		Timer.intervalId = setInterval(() => Timer.update(), 250);

		Timer.update();

	}

	static update() {

		if (Timer.end()) {

			return;

		}

		let seconds = Math.round(Math.abs(Date.now() - Timer.timeFinish) / 1000);

		Timer.sb.innerText = `${Timer.message} 00:${(seconds < 10 ? '0' : '')}${seconds}`;

	}

	static end() {

		if ((Date.now() - Timer.timeFinish) >= 0) {

			Timer.stop();

			Timer.callback();

			return true;

		}

		return false;

	}

	static stop() {

		if (Timer.intervalId) {

			clearInterval(Timer.intervalId);

			Timer.intervalId = false;

		}

	}

}

class PreloadImages {

	static load(callback, url) {

		let preload = new Image();

		preload.src = url;

		preload.addEventListener('load', () => {

			callback();

		});

	}

	static async loadAsync(url) {

		let image = new Image();

		image.src = url;

		return new Promise((resolve, reject) => {

			image.addEventListener('load', () => {
				resolve(image);
			});

			image.addEventListener('error', (error) => reject(error));

		});

	}

	constructor(target, callback) {

		this.target = target;

		this.callback = callback;

		this.observer = new IntersectionObserver((entries) => this.preload(entries));

	}

	add(element, target) {

		element.style.opacity = 0;

		this.observer.observe(element);

		if (target) {

			target.append(element);

		}
		else {

			this.target.append(element);

		}

	}

	preload(entries) {

		for (let entry of entries) {

			if (entry.isIntersecting) {

				let preload = new Image();

				preload.src = entry.target.dataset.url;

				preload.addEventListener('load', () => {

					entry.target.style.backgroundImage = `url("${entry.target.dataset.url}")`;

					let animation = entry.target.animate({ opacity: [0, 1], transform: ['scale(0.9)', 'scale(1)'] }, { duration: 500, easing: 'ease-out', fill: 'forwards' });

					if (this.callback) {

						animation.onfinish = () => {

							this.callback(entry.target);

							animation.onfinish = null;

						}

					}

				});

				this.observer.unobserve(entry.target);

			}

		}

	}

}

class Game {

	static sizeX = 10;

	static sizeY = 15;

	static target = false;

	static targetAnimate = false;

	static blocked = false;

	static eventBack = false;

	static eventFinish = false;

	static eventExit = false;

	static init(body, object, isSplah) {

		if (object) {

			if ('back' in object) {

				Game.eventBack = object.back;

			}

			if ('finish' in object) {

				Game.eventFinish = object.finish;

			}

			if ('exit' in object) {

				Game.eventExit = object.exit;

			}

		}

		Game.units = new Array();

		Game.info = DOM({ style: "game-info", event: ['click', (e) => Game.click(e)] });

		Game.scoring = DOM({ style: "game-scoring", event: ['click', (e) => Game.click(e)] });

		Game.field = DOM({ style: "game-field", event: ['click', (e) => Game.click(e)] });

		Game.fieldScoringContainer = DOM({ style: "game-field-scoring-container", event: ['click', (e) => Game.click(e)] }, Game.scoring, Game.field);

		Game.viewScore = DOM({ style: "game-view-score" });

		Game.viewInfo = DOM({ style: "game-view-info" });

		Game.viewMoves = DOM();;

		Game.viewTotalScore = DOM();

		Game.map = object.map;

		Game.background = object.background;

		Game.units = object.unit;

		Game.rarity = object.rarity;

		Game.moves = object.move;

		Game.dataScore = new Object();

		Game.totalScore = 0;

		if ('score' in object) {

			for (let id in object.score) {

				Game.score(id, object.score[id]);

			}

		}

		Game.viewMoves.innerText = `Ходы: ${object.move} (${object.moveTotal})`;

		Game.viewTotalScore.innerText = `Оcколки: ${Game.totalScore} | `;

		if (!isSplah) {
			Game.viewInfo.append(
				DOM({ event: ['click', () => Game.eventBack()] }, 'Вернуться назад'),
				DOM({}, ` | `)
			)
		}

		Game.viewInfo.append(
			Game.viewTotalScore,
			Game.viewMoves,
			DOM({}, ` | `),
			DOM({ event: ['click', () => Game.eventFinish()] }, 'Завершить игру')
		);

		Game.scoring.append(Game.viewScore);
		Game.info.append(Game.viewInfo);

		if (body) {

			body.append(Game.info, Game.fieldScoringContainer);

		}
		else {

			document.body.append(Game.info, Game.field);

		}

		Game.view();

	}

	static score(id, number) {

		if ((!id) || (id == '0')) {

			return;

		}

		if (!(id in Game.dataScore)) {

			let unit = DOM({ style: [`rarity${Game.rarity[id]}`, 'game-rarity-general'] });
			let text = DOM({ style: 'game-text' });

			unit.style.backgroundImage = `url(content/talents/${id}.webp)`;

			unit.append(text);

			Game.dataScore[id] = unit;

			Game.viewScore.append(unit);

		}

		Game.totalScore += number;

		Game.viewTotalScore.innerText = `Оcколки: ${Game.totalScore} | `;

		Game.dataScore[id].firstChild.innerText = (Number(Game.dataScore[id].innerText) + number);

		Game.dataScore[id].animate({ transform: ['scale(1)', 'scale(1.5)', 'scale(1)'] }, { duration: 250, fill: 'both', easing: 'ease-out' });

	}

	static position(coordinate) {

		return (coordinate ? `${coordinate * 100}cqh` : '0');

	}

	static createUnit(id, x, y) {

		let unit = DOM({ style: 'game-unit-item', id: `${x}:${y}` });

		let rarity = '';

		switch (Game.rarity[id]) {

			case 2: rarity = '0 0 20cqh rgba(174,80,251,0.8), inset 10cqh 10cqh 15cqh rgba(174,80,251,0.5)'; break;

			case 3: rarity = '0 0 20cqh rgba(255,156,32,0.8), inset 10cqh 10cqh 15cqh rgba(255,156,32,0.5)'; break;

			case 4: rarity = '0 0 20cqh rgba(255,26,26,0.8), inset 10cqh 10cqh 15cqh rgba(255,26,26,0.5)'; break;

		}

		if (rarity) {

			unit.style.boxShadow = rarity;

		}

		unit.style.backgroundImage = `url(content/talents/${id}.webp)`;

		unit.style.top = `${Game.position(x)}`;

		unit.style.left = `${Game.position(y)}`;

		Game.field.append(DOM({ style: 'unit-container', event: ['click', (e) => Game.click(e)] }, unit));

		return unit;

	}

	static createBackgroundUnit(x, y) {

		let unit = DOM({ style: 'game-unit-bg', id: `${x}:${y}` });

		unit.id = `BG:${x}:${y}`;

		unit.style.backgroundImage = `url(content/talents/763.webp)`;

		unit.style.top = `${Game.position(x)}`;

		unit.style.left = `${Game.position(y)}`;

		Game.field.append(DOM({ style: 'unit-container', event: ['click', (e) => Game.click(e)] }, unit));

		return unit;

	}

	static shuffle(arr) {

		let j, temp;

		for (let i = arr.length - 1; i > 0; i--) {

			j = Math.floor(Math.random() * (i + 1));

			temp = arr[j];

			arr[j] = arr[i];

			arr[i] = temp;

		}

		return arr;

	}

	static getRandomInt(min, max) {

		min = Math.ceil(min);

		max = Math.floor(max);

		return Math.floor(Math.random() * (max - min + 1)) + min;

	}

	static view() {

		Game.blocked = true;

		let units = new Array(), background = new Array();

		for (let x = 0; x < Game.sizeX; x++) {

			for (let y = 0; y < Game.sizeY; y++) {

				if (Game.background[x][y]) {

					background.push({ x: x, y: y, body: Game.createBackgroundUnit(x, y) });

				}

				units.push(Game.createUnit(Game.map[x][y], x, y));

			}

		}

		units = Game.shuffle(units);

		let delay = 0, number = 0;

		for (let unit of units) {

			number++;

			let topOffset = `${(unit.offsetTop) + Game.getRandomInt(-50, 50)}cqh`;

			let leftOffset = `${(unit.offsetLeft) + Game.getRandomInt(-50, 50)}cqh`;

			let animate = unit.animate({
				top: [topOffset, unit.style.top], left: [leftOffset, unit.style.left],
				opacity: [0, 1],
				transform: ['scale(2.5)', 'scale(0.9)']
			},
				{ delay: delay, duration: 250, fill: 'both', easing: 'ease-out' });

			delay += 5;

			if (number == units.length) {

				animate.onfinish = () => {

					for (let item of background) {

						let state = Game.background[item.x][item.y];

						switch (state) {

							case 1: state = 0.9; break;

							case 2: state = 0.6; break;

							case 3: state = 0.3; break;

						}

						item.body.animate({ opacity: [0, state], transform: ['scale(0.3)', 'scale(1)', 'scale(0.9)'] }, { duration: 500, fill: 'both', easing: 'ease-in' });

					}

					Game.blocked = false;


					animate.onfinish = null;

				}

			}

		}

	}

	static async click(event) {

		if (Game.blocked) {

			return;

		}

		if (!event.target.id) {

			return;

		}

		let data = event.target.id.split(':');

		if (!Game.map[data[0]][data[1]]) {

			return;

		}

		if (Game.target) {

			if (Game.target.id == event.target.id) {

				Game.target = false;

				Game.targetAnimate.cancel();

				return;

			}

			Game.targetAnimate.cancel();

			try {

				await Game.move(Game.target, event.target);

			}
			catch (e) {
				console.log(e);
				return Game.exit();

			}

			Game.target = false;

		}
		else {

			Game.target = event.target;

			Game.targetAnimate = Game.target.animate({ transform: ['scale(0.9)', 'scale(1.1)', 'scale(0.9)'] }, { duration: 500, iterations: Infinity });

		}

	}

	static async move(element1, element2) {

		Game.blocked = true;

		let data1 = element1.id.split(':'), data2 = element2.id.split(':');

		let protect = false;

		if ((((Number(data1[0]) - 1) == data2[0]) && (data1[1] == data2[1])) || (((Number(data1[0]) + 1) == data2[0]) && (data1[1] == data2[1])) || (((Number(data1[1]) - 1) == data2[1]) && (data1[0] == data2[0])) || (((Number(data1[1]) + 1) == data2[1]) && (data1[0] == data2[0]))) {

			protect = true;

		}

		if (!protect) {

			Game.blocked = false;

			return;

		}

		let request = await App.api.request('gamev2', 'move2', { x1: data1[0], y1: data1[1], x2: data2[0], y2: data2[1] });

		if (request.render.length) {

			element1.id = `${data2[0]}:${data2[1]}`;

			element2.id = `${data1[0]}:${data1[1]}`;

			Game.moves++;

			Game.viewMoves.innerText = `Ходов: ${request.move} (${request.moveTotal})`;

		}

		let element1Animate = element1.animate({ top: [`${Game.position(data1[0])}`, `${Game.position(data2[0])}`], left: [`${Game.position(data1[1])}`, `${Game.position(data2[1])}`] }, { duration: 250, fill: 'both' });

		let element2Animate = element2.animate({ top: [`${Game.position(data2[0])}`, `${Game.position(data1[0])}`], left: [`${Game.position(data2[1])}`, `${Game.position(data1[1])}`] }, { duration: 250, fill: 'both' });

		element1Animate.onfinish = async () => {

			if (request.render.length) {

				for (let item of request.render) {

					switch (item.action) {

						case 'hide':

							await Game.hideAnimate(item.data);

							await Game.backgroundAnimate(item.data);

							break;

						case 'move': await Game.moveAnimate(item.data); break;

						case 'add': await Game.dropAnimate(item.data); break;

					}

				}

				if (request.move != request.moveTotal) {

					Game.blocked = false;

				}

			}
			else {

				element1Animate.reverse();

				if (request.move != request.moveTotal) {

					Game.blocked = false;

				}

			}

			element1Animate.onfinish = null;

		}

		element2Animate.onfinish = () => {

			if (!request.render.length) {

				element2Animate.reverse();

			}

			element2Animate.onfinish = null;

		}

	}

	static async hideAnimate(data) {

		return new Promise((resolve, reject) => {

			if (!data.hide.length) {

				resolve(false);

			}

			let number = 1;

			for (let unit of data.hide) {

				let findUnit = document.getElementById(`${unit.x}:${unit.y}`);

				if (!findUnit) {

					continue;

				}

				let animate = findUnit.animate({ opacity: [1, 0], transform: ['scale(0.9)', 'scale(3)'] }, { duration: 250, fill: 'both', easing: 'ease-out' });

				if (number == data.hide.length) {

					animate.onfinish = () => {

						for (let id in data.score) {

							Game.score(id, data.score[id]);

						}

						findUnit.remove();

						resolve(true);

					}

				}
				else {

					animate.onfinish = () => {

						findUnit.remove();

					}

				}

				number++;

			}

		});

	}

	static async backgroundAnimate(data) {

		return new Promise((resolve, reject) => {

			if (!data.hide.length) {

				resolve(false);

			}

			let hideBackground = new Array();

			for (let unit of data.hide) {

				if (!Game.background[unit.x][unit.y]) {

					continue;

				}

				hideBackground.push({ x: unit.x, y: unit.y, body: document.getElementById(`BG:${unit.x}:${unit.y}`) });

			}

			if (!hideBackground.length) {

				resolve(true);

			}

			let number = 0, state = [0, 0.9, 0.6, 0.3];

			for (let item of hideBackground) {

				number++;

				if (!item.body) {

					continue;

				}

				let currentState = Game.background[item.x][item.y];

				Game.background[item.x][item.y]--;

				let animate = item.body.animate({ opacity: [currentState, Game.background[item.x][item.y]], transform: ['scale(0.9)', 'scale(1.6)', 'scale(0.9)'] }, { duration: 500, fill: 'both', easing: 'ease-out' });

				if (number == hideBackground.length) {

					animate.onfinish = () => {

						if (!Game.background[item.x][item.y]) {

							item.body.remove();

						}

						resolve(true);

					}

				}
				else {

					animate.onfinish = () => {

						if (!Game.background[item.x][item.y]) {

							item.body.remove();

						}

					}

				}

			}

		});

	}

	static async moveAnimate(data) {

		return new Promise((resolve, reject) => {

			if (!data.length) {

				resolve(false);

			}

			let number = 1;

			for (let unit of data) {

				let findUnit = document.getElementById(`${unit.x1}:${unit.y1}`);

				findUnit.id = `${unit.x2}:${unit.y2}`;

				let animate = findUnit.animate({ top: [`${Game.position(unit.x1)}`, `${Game.position(unit.x2)}`], transform: ['rotate(0) scale(0.9)', `rotate(${Game.getRandomInt(-180, 180)}deg) scale(0.9)`, 'rotate(0) scale(0.9)'] }, { duration: 250, fill: 'both', easing: 'ease-in' });

				if (number == data.length) {

					animate.onfinish = () => {

						animate.onfinish = null;

						resolve(true);

					}

				}

				number++;

			}

		});

	}

	static async dropAnimate(data) {

		return new Promise((resolve, reject) => {

			if (!data.length) {

				resolve(false);

			}

			let number = 1;

			for (let unit of data) {

				let createUnit = Game.createUnit(unit.id, unit.x, unit.y);

				let animate = createUnit.animate({ opacity: [0, 1], transform: ['rotate(0) scale(0.9)', 'rotate(360deg) scale(0.9)'] }, { duration: 250, fill: 'both', easing: 'ease-in' });

				if (number == data.length) {

					animate.onfinish = () => {

						animate.onfinish = null;

						resolve(true);

					}

				}

				number++;

			}

		});

	}

	static exit() {

		if (Game.eventExit) {

			Game.eventExit();

		}

	}

}

class Splash {

	static init() {

		Splash.body = document.createElement('div');

		Splash.body.style.display = 'none';

		Splash.body.classList.add('splash');

		document.body.append(Splash.body);

	}

	static show(element, content = true) {

		if (Splash.body.firstChild) {

			while (Splash.body.firstChild) {

				Splash.body.firstChild.remove();

			}

		}

		if (content) {

			let body = document.createElement('div');

			body.classList.add('splash-content');

			body.append(element);

			Splash.body.append(body);

		}
		else {

			Splash.body.append(element);

		}

		Splash.body.style.display = 'flex';

	}

	static hide() {

		Splash.body.style.display = 'none';

	}

}

function DOM(properties) {

	let parent = document.createElement(((typeof properties == 'object') && ('tag' in properties)) ? properties.tag : 'div');

	if (typeof properties == 'string') {

		parent.append(properties);

	}
	else {

		for (let property in properties) {

			if (property == 'tag') continue;

			switch (property) {

				case 'style':

					if (typeof properties.style === 'string') {
						parent.classList.add(properties.style);
					} else {
						parent.classList.add(...properties.style);
					}

					break;

				case 'data':

					for (let key in properties.data) {

						parent.dataset[key] = properties.data[key];

					}

					break;

				case 'event':

					parent.addEventListener(properties.event[0], properties.event[1]);

					break;

				default:

					parent[property] = properties[property];

					break;

			}

		}

	}

	if (arguments.length > 1) {

		let i, fragment = document.createDocumentFragment();

		for (i = 1; i < arguments.length; i++) {

			fragment.append(arguments[i]);

		}

		parent.append(fragment);

	}

	return parent;

}

// Castle
{
	/**
	 * @fileoverview gl-matrix - High performance matrix and vector operations
	 * @author Brandon Jones
	 * @author Colin MacKenzie IV
	 * @version 2.3.2
	 */

	/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE. */

	(function webpackUniversalModuleDefinition(root, factory) {
		if (typeof exports === 'object' && typeof module === 'object')
			module.exports = factory();
		else if (typeof define === 'function' && define.amd)
			define(factory);
		else {
			var a = factory();
			for (var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
		}
	})(this, function () {
		return /******/ (function (modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if (installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
					/******/
};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
				/******/
}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
			/******/
})
/************************************************************************/
/******/([
/* 0 */
/***/ function (module, exports, __webpack_require__) {

				/**
				 * @fileoverview gl-matrix - High performance matrix and vector operations
				 * @author Brandon Jones
				 * @author Colin MacKenzie IV
				 * @version 2.3.2
				 */

				/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.
			
				Permission is hereby granted, free of charge, to any person obtaining a copy
				of this software and associated documentation files (the "Software"), to deal
				in the Software without restriction, including without limitation the rights
				to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
				copies of the Software, and to permit persons to whom the Software is
				furnished to do so, subject to the following conditions:
			
				The above copyright notice and this permission notice shall be included in
				all copies or substantial portions of the Software.
			
				THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
				IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
				FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
				AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
				LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
				OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
				THE SOFTWARE. */
				// END HEADER

				exports.glMatrix = __webpack_require__(1);
				exports.mat2 = __webpack_require__(2);
				exports.mat2d = __webpack_require__(3);
				exports.mat3 = __webpack_require__(4);
				exports.mat4 = __webpack_require__(5);
				exports.quat = __webpack_require__(6);
				exports.vec2 = __webpack_require__(9);
				exports.vec3 = __webpack_require__(7);
				exports.vec4 = __webpack_require__(8);

				/***/
},
/* 1 */
/***/ function (module, exports) {

				/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.
			
				Permission is hereby granted, free of charge, to any person obtaining a copy
				of this software and associated documentation files (the "Software"), to deal
				in the Software without restriction, including without limitation the rights
				to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
				copies of the Software, and to permit persons to whom the Software is
				furnished to do so, subject to the following conditions:
			
				The above copyright notice and this permission notice shall be included in
				all copies or substantial portions of the Software.
			
				THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
				IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
				FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
				AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
				LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
				OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
				THE SOFTWARE. */

				/**
				 * @class Common utilities
				 * @name glMatrix
				 */
				var glMatrix = {};

				// Configuration Constants
				glMatrix.EPSILON = 0.000001;
				glMatrix.ARRAY_TYPE = (typeof Float32Array !== 'undefined') ? Float32Array : Array;
				glMatrix.RANDOM = Math.random;
				glMatrix.ENABLE_SIMD = false;

				// Capability detection
				glMatrix.SIMD_AVAILABLE = (glMatrix.ARRAY_TYPE === Float32Array) && ('SIMD' in this);
				glMatrix.USE_SIMD = glMatrix.ENABLE_SIMD && glMatrix.SIMD_AVAILABLE;

				/**
				 * Sets the type of array used when creating new vectors and matrices
				 *
				 * @param {Type} type Array type, such as Float32Array or Array
				 */
				glMatrix.setMatrixArrayType = function (type) {
					glMatrix.ARRAY_TYPE = type;
				}

				var degree = Math.PI / 180;

				/**
				* Convert Degree To Radian
				*
				* @param {Number} Angle in Degrees
				*/
				glMatrix.toRadian = function (a) {
					return a * degree;
				}

				module.exports = glMatrix;


				/***/
},
/* 2 */
/***/ function (module, exports, __webpack_require__) {

				/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.
			
				Permission is hereby granted, free of charge, to any person obtaining a copy
				of this software and associated documentation files (the "Software"), to deal
				in the Software without restriction, including without limitation the rights
				to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
				copies of the Software, and to permit persons to whom the Software is
				furnished to do so, subject to the following conditions:
			
				The above copyright notice and this permission notice shall be included in
				all copies or substantial portions of the Software.
			
				THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
				IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
				FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
				AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
				LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
				OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
				THE SOFTWARE. */

				var glMatrix = __webpack_require__(1);

				/**
				 * @class 2x2 Matrix
				 * @name mat2
				 */
				var mat2 = {};

				/**
				 * Creates a new identity mat2
				 *
				 * @returns {mat2} a new 2x2 matrix
				 */
				mat2.create = function () {
					var out = new glMatrix.ARRAY_TYPE(4);
					out[0] = 1;
					out[1] = 0;
					out[2] = 0;
					out[3] = 1;
					return out;
				};

				/**
				 * Creates a new mat2 initialized with values from an existing matrix
				 *
				 * @param {mat2} a matrix to clone
				 * @returns {mat2} a new 2x2 matrix
				 */
				mat2.clone = function (a) {
					var out = new glMatrix.ARRAY_TYPE(4);
					out[0] = a[0];
					out[1] = a[1];
					out[2] = a[2];
					out[3] = a[3];
					return out;
				};

				/**
				 * Copy the values from one mat2 to another
				 *
				 * @param {mat2} out the receiving matrix
				 * @param {mat2} a the source matrix
				 * @returns {mat2} out
				 */
				mat2.copy = function (out, a) {
					out[0] = a[0];
					out[1] = a[1];
					out[2] = a[2];
					out[3] = a[3];
					return out;
				};

				/**
				 * Set a mat2 to the identity matrix
				 *
				 * @param {mat2} out the receiving matrix
				 * @returns {mat2} out
				 */
				mat2.identity = function (out) {
					out[0] = 1;
					out[1] = 0;
					out[2] = 0;
					out[3] = 1;
					return out;
				};

				/**
				 * Transpose the values of a mat2
				 *
				 * @param {mat2} out the receiving matrix
				 * @param {mat2} a the source matrix
				 * @returns {mat2} out
				 */
				mat2.transpose = function (out, a) {
					// If we are transposing ourselves we can skip a few steps but have to cache some values
					if (out === a) {
						var a1 = a[1];
						out[1] = a[2];
						out[2] = a1;
					} else {
						out[0] = a[0];
						out[1] = a[2];
						out[2] = a[1];
						out[3] = a[3];
					}

					return out;
				};

				/**
				 * Inverts a mat2
				 *
				 * @param {mat2} out the receiving matrix
				 * @param {mat2} a the source matrix
				 * @returns {mat2} out
				 */
				mat2.invert = function (out, a) {
					var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],

						// Calculate the determinant
						det = a0 * a3 - a2 * a1;

					if (!det) {
						return null;
					}
					det = 1.0 / det;

					out[0] = a3 * det;
					out[1] = -a1 * det;
					out[2] = -a2 * det;
					out[3] = a0 * det;

					return out;
				};

				/**
				 * Calculates the adjugate of a mat2
				 *
				 * @param {mat2} out the receiving matrix
				 * @param {mat2} a the source matrix
				 * @returns {mat2} out
				 */
				mat2.adjoint = function (out, a) {
					// Caching this value is nessecary if out == a
					var a0 = a[0];
					out[0] = a[3];
					out[1] = -a[1];
					out[2] = -a[2];
					out[3] = a0;

					return out;
				};

				/**
				 * Calculates the determinant of a mat2
				 *
				 * @param {mat2} a the source matrix
				 * @returns {Number} determinant of a
				 */
				mat2.determinant = function (a) {
					return a[0] * a[3] - a[2] * a[1];
				};

				/**
				 * Multiplies two mat2's
				 *
				 * @param {mat2} out the receiving matrix
				 * @param {mat2} a the first operand
				 * @param {mat2} b the second operand
				 * @returns {mat2} out
				 */
				mat2.multiply = function (out, a, b) {
					var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
					var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
					out[0] = a0 * b0 + a2 * b1;
					out[1] = a1 * b0 + a3 * b1;
					out[2] = a0 * b2 + a2 * b3;
					out[3] = a1 * b2 + a3 * b3;
					return out;
				};

				/**
				 * Alias for {@link mat2.multiply}
				 * @function
				 */
				mat2.mul = mat2.multiply;

				/**
				 * Rotates a mat2 by the given angle
				 *
				 * @param {mat2} out the receiving matrix
				 * @param {mat2} a the matrix to rotate
				 * @param {Number} rad the angle to rotate the matrix by
				 * @returns {mat2} out
				 */
				mat2.rotate = function (out, a, rad) {
					var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
						s = Math.sin(rad),
						c = Math.cos(rad);
					out[0] = a0 * c + a2 * s;
					out[1] = a1 * c + a3 * s;
					out[2] = a0 * -s + a2 * c;
					out[3] = a1 * -s + a3 * c;
					return out;
				};

				/**
				 * Scales the mat2 by the dimensions in the given vec2
				 *
				 * @param {mat2} out the receiving matrix
				 * @param {mat2} a the matrix to rotate
				 * @param {vec2} v the vec2 to scale the matrix by
				 * @returns {mat2} out
				 **/
				mat2.scale = function (out, a, v) {
					var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
						v0 = v[0], v1 = v[1];
					out[0] = a0 * v0;
					out[1] = a1 * v0;
					out[2] = a2 * v1;
					out[3] = a3 * v1;
					return out;
				};

				/**
				 * Creates a matrix from a given angle
				 * This is equivalent to (but much faster than):
				 *
				 *     mat2.identity(dest);
				 *     mat2.rotate(dest, dest, rad);
				 *
				 * @param {mat2} out mat2 receiving operation result
				 * @param {Number} rad the angle to rotate the matrix by
				 * @returns {mat2} out
				 */
				mat2.fromRotation = function (out, rad) {
					var s = Math.sin(rad),
						c = Math.cos(rad);
					out[0] = c;
					out[1] = s;
					out[2] = -s;
					out[3] = c;
					return out;
				}

				/**
				 * Creates a matrix from a vector scaling
				 * This is equivalent to (but much faster than):
				 *
				 *     mat2.identity(dest);
				 *     mat2.scale(dest, dest, vec);
				 *
				 * @param {mat2} out mat2 receiving operation result
				 * @param {vec2} v Scaling vector
				 * @returns {mat2} out
				 */
				mat2.fromScaling = function (out, v) {
					out[0] = v[0];
					out[1] = 0;
					out[2] = 0;
					out[3] = v[1];
					return out;
				}

				/**
				 * Returns a string representation of a mat2
				 *
				 * @param {mat2} mat matrix to represent as a string
				 * @returns {String} string representation of the matrix
				 */
				mat2.str = function (a) {
					return 'mat2(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
				};

				/**
				 * Returns Frobenius norm of a mat2
				 *
				 * @param {mat2} a the matrix to calculate Frobenius norm of
				 * @returns {Number} Frobenius norm
				 */
				mat2.frob = function (a) {
					return (Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2)))
				};

				/**
				 * Returns L, D and U matrices (Lower triangular, Diagonal and Upper triangular) by factorizing the input matrix
				 * @param {mat2} L the lower triangular matrix 
				 * @param {mat2} D the diagonal matrix 
				 * @param {mat2} U the upper triangular matrix 
				 * @param {mat2} a the input matrix to factorize
				 */

				mat2.LDU = function (L, D, U, a) {
					L[2] = a[2] / a[0];
					U[0] = a[0];
					U[1] = a[1];
					U[3] = a[3] - L[2] * U[1];
					return [L, D, U];
				};


				module.exports = mat2;


				/***/
},
/* 3 */
/***/ function (module, exports, __webpack_require__) {

				/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.
			
				Permission is hereby granted, free of charge, to any person obtaining a copy
				of this software and associated documentation files (the "Software"), to deal
				in the Software without restriction, including without limitation the rights
				to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
				copies of the Software, and to permit persons to whom the Software is
				furnished to do so, subject to the following conditions:
			
				The above copyright notice and this permission notice shall be included in
				all copies or substantial portions of the Software.
			
				THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
				IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
				FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
				AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
				LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
				OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
				THE SOFTWARE. */

				var glMatrix = __webpack_require__(1);

				/**
				 * @class 2x3 Matrix
				 * @name mat2d
				 * 
				 * @description 
				 * A mat2d contains six elements defined as:
				 * <pre>
				 * [a, c, tx,
				 *  b, d, ty]
				 * </pre>
				 * This is a short form for the 3x3 matrix:
				 * <pre>
				 * [a, c, tx,
				 *  b, d, ty,
				 *  0, 0, 1]
				 * </pre>
				 * The last row is ignored so the array is shorter and operations are faster.
				 */
				var mat2d = {};

				/**
				 * Creates a new identity mat2d
				 *
				 * @returns {mat2d} a new 2x3 matrix
				 */
				mat2d.create = function () {
					var out = new glMatrix.ARRAY_TYPE(6);
					out[0] = 1;
					out[1] = 0;
					out[2] = 0;
					out[3] = 1;
					out[4] = 0;
					out[5] = 0;
					return out;
				};

				/**
				 * Creates a new mat2d initialized with values from an existing matrix
				 *
				 * @param {mat2d} a matrix to clone
				 * @returns {mat2d} a new 2x3 matrix
				 */
				mat2d.clone = function (a) {
					var out = new glMatrix.ARRAY_TYPE(6);
					out[0] = a[0];
					out[1] = a[1];
					out[2] = a[2];
					out[3] = a[3];
					out[4] = a[4];
					out[5] = a[5];
					return out;
				};

				/**
				 * Copy the values from one mat2d to another
				 *
				 * @param {mat2d} out the receiving matrix
				 * @param {mat2d} a the source matrix
				 * @returns {mat2d} out
				 */
				mat2d.copy = function (out, a) {
					out[0] = a[0];
					out[1] = a[1];
					out[2] = a[2];
					out[3] = a[3];
					out[4] = a[4];
					out[5] = a[5];
					return out;
				};

				/**
				 * Set a mat2d to the identity matrix
				 *
				 * @param {mat2d} out the receiving matrix
				 * @returns {mat2d} out
				 */
				mat2d.identity = function (out) {
					out[0] = 1;
					out[1] = 0;
					out[2] = 0;
					out[3] = 1;
					out[4] = 0;
					out[5] = 0;
					return out;
				};

				/**
				 * Inverts a mat2d
				 *
				 * @param {mat2d} out the receiving matrix
				 * @param {mat2d} a the source matrix
				 * @returns {mat2d} out
				 */
				mat2d.invert = function (out, a) {
					var aa = a[0], ab = a[1], ac = a[2], ad = a[3],
						atx = a[4], aty = a[5];

					var det = aa * ad - ab * ac;
					if (!det) {
						return null;
					}
					det = 1.0 / det;

					out[0] = ad * det;
					out[1] = -ab * det;
					out[2] = -ac * det;
					out[3] = aa * det;
					out[4] = (ac * aty - ad * atx) * det;
					out[5] = (ab * atx - aa * aty) * det;
					return out;
				};

				/**
				 * Calculates the determinant of a mat2d
				 *
				 * @param {mat2d} a the source matrix
				 * @returns {Number} determinant of a
				 */
				mat2d.determinant = function (a) {
					return a[0] * a[3] - a[1] * a[2];
				};

				/**
				 * Multiplies two mat2d's
				 *
				 * @param {mat2d} out the receiving matrix
				 * @param {mat2d} a the first operand
				 * @param {mat2d} b the second operand
				 * @returns {mat2d} out
				 */
				mat2d.multiply = function (out, a, b) {
					var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
						b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5];
					out[0] = a0 * b0 + a2 * b1;
					out[1] = a1 * b0 + a3 * b1;
					out[2] = a0 * b2 + a2 * b3;
					out[3] = a1 * b2 + a3 * b3;
					out[4] = a0 * b4 + a2 * b5 + a4;
					out[5] = a1 * b4 + a3 * b5 + a5;
					return out;
				};

				/**
				 * Alias for {@link mat2d.multiply}
				 * @function
				 */
				mat2d.mul = mat2d.multiply;

				/**
				 * Rotates a mat2d by the given angle
				 *
				 * @param {mat2d} out the receiving matrix
				 * @param {mat2d} a the matrix to rotate
				 * @param {Number} rad the angle to rotate the matrix by
				 * @returns {mat2d} out
				 */
				mat2d.rotate = function (out, a, rad) {
					var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
						s = Math.sin(rad),
						c = Math.cos(rad);
					out[0] = a0 * c + a2 * s;
					out[1] = a1 * c + a3 * s;
					out[2] = a0 * -s + a2 * c;
					out[3] = a1 * -s + a3 * c;
					out[4] = a4;
					out[5] = a5;
					return out;
				};

				/**
				 * Scales the mat2d by the dimensions in the given vec2
				 *
				 * @param {mat2d} out the receiving matrix
				 * @param {mat2d} a the matrix to translate
				 * @param {vec2} v the vec2 to scale the matrix by
				 * @returns {mat2d} out
				 **/
				mat2d.scale = function (out, a, v) {
					var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
						v0 = v[0], v1 = v[1];
					out[0] = a0 * v0;
					out[1] = a1 * v0;
					out[2] = a2 * v1;
					out[3] = a3 * v1;
					out[4] = a4;
					out[5] = a5;
					return out;
				};

				/**
				 * Translates the mat2d by the dimensions in the given vec2
				 *
				 * @param {mat2d} out the receiving matrix
				 * @param {mat2d} a the matrix to translate
				 * @param {vec2} v the vec2 to translate the matrix by
				 * @returns {mat2d} out
				 **/
				mat2d.translate = function (out, a, v) {
					var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
						v0 = v[0], v1 = v[1];
					out[0] = a0;
					out[1] = a1;
					out[2] = a2;
					out[3] = a3;
					out[4] = a0 * v0 + a2 * v1 + a4;
					out[5] = a1 * v0 + a3 * v1 + a5;
					return out;
				};

				/**
				 * Creates a matrix from a given angle
				 * This is equivalent to (but much faster than):
				 *
				 *     mat2d.identity(dest);
				 *     mat2d.rotate(dest, dest, rad);
				 *
				 * @param {mat2d} out mat2d receiving operation result
				 * @param {Number} rad the angle to rotate the matrix by
				 * @returns {mat2d} out
				 */
				mat2d.fromRotation = function (out, rad) {
					var s = Math.sin(rad), c = Math.cos(rad);
					out[0] = c;
					out[1] = s;
					out[2] = -s;
					out[3] = c;
					out[4] = 0;
					out[5] = 0;
					return out;
				}

				/**
				 * Creates a matrix from a vector scaling
				 * This is equivalent to (but much faster than):
				 *
				 *     mat2d.identity(dest);
				 *     mat2d.scale(dest, dest, vec);
				 *
				 * @param {mat2d} out mat2d receiving operation result
				 * @param {vec2} v Scaling vector
				 * @returns {mat2d} out
				 */
				mat2d.fromScaling = function (out, v) {
					out[0] = v[0];
					out[1] = 0;
					out[2] = 0;
					out[3] = v[1];
					out[4] = 0;
					out[5] = 0;
					return out;
				}

				/**
				 * Creates a matrix from a vector translation
				 * This is equivalent to (but much faster than):
				 *
				 *     mat2d.identity(dest);
				 *     mat2d.translate(dest, dest, vec);
				 *
				 * @param {mat2d} out mat2d receiving operation result
				 * @param {vec2} v Translation vector
				 * @returns {mat2d} out
				 */
				mat2d.fromTranslation = function (out, v) {
					out[0] = 1;
					out[1] = 0;
					out[2] = 0;
					out[3] = 1;
					out[4] = v[0];
					out[5] = v[1];
					return out;
				}

				/**
				 * Returns a string representation of a mat2d
				 *
				 * @param {mat2d} a matrix to represent as a string
				 * @returns {String} string representation of the matrix
				 */
				mat2d.str = function (a) {
					return 'mat2d(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' +
						a[3] + ', ' + a[4] + ', ' + a[5] + ')';
				};

				/**
				 * Returns Frobenius norm of a mat2d
				 *
				 * @param {mat2d} a the matrix to calculate Frobenius norm of
				 * @returns {Number} Frobenius norm
				 */
				mat2d.frob = function (a) {
					return (Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + 1))
				};

				module.exports = mat2d;


				/***/
},
/* 4 */
/***/ function (module, exports, __webpack_require__) {

				/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.
			
				Permission is hereby granted, free of charge, to any person obtaining a copy
				of this software and associated documentation files (the "Software"), to deal
				in the Software without restriction, including without limitation the rights
				to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
				copies of the Software, and to permit persons to whom the Software is
				furnished to do so, subject to the following conditions:
			
				The above copyright notice and this permission notice shall be included in
				all copies or substantial portions of the Software.
			
				THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
				IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
				FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
				AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
				LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
				OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
				THE SOFTWARE. */

				var glMatrix = __webpack_require__(1);

				/**
				 * @class 3x3 Matrix
				 * @name mat3
				 */
				var mat3 = {};

				/**
				 * Creates a new identity mat3
				 *
				 * @returns {mat3} a new 3x3 matrix
				 */
				mat3.create = function () {
					var out = new glMatrix.ARRAY_TYPE(9);
					out[0] = 1;
					out[1] = 0;
					out[2] = 0;
					out[3] = 0;
					out[4] = 1;
					out[5] = 0;
					out[6] = 0;
					out[7] = 0;
					out[8] = 1;
					return out;
				};

				/**
				 * Copies the upper-left 3x3 values into the given mat3.
				 *
				 * @param {mat3} out the receiving 3x3 matrix
				 * @param {mat4} a   the source 4x4 matrix
				 * @returns {mat3} out
				 */
				mat3.fromMat4 = function (out, a) {
					out[0] = a[0];
					out[1] = a[1];
					out[2] = a[2];
					out[3] = a[4];
					out[4] = a[5];
					out[5] = a[6];
					out[6] = a[8];
					out[7] = a[9];
					out[8] = a[10];
					return out;
				};

				/**
				 * Creates a new mat3 initialized with values from an existing matrix
				 *
				 * @param {mat3} a matrix to clone
				 * @returns {mat3} a new 3x3 matrix
				 */
				mat3.clone = function (a) {
					var out = new glMatrix.ARRAY_TYPE(9);
					out[0] = a[0];
					out[1] = a[1];
					out[2] = a[2];
					out[3] = a[3];
					out[4] = a[4];
					out[5] = a[5];
					out[6] = a[6];
					out[7] = a[7];
					out[8] = a[8];
					return out;
				};

				/**
				 * Copy the values from one mat3 to another
				 *
				 * @param {mat3} out the receiving matrix
				 * @param {mat3} a the source matrix
				 * @returns {mat3} out
				 */
				mat3.copy = function (out, a) {
					out[0] = a[0];
					out[1] = a[1];
					out[2] = a[2];
					out[3] = a[3];
					out[4] = a[4];
					out[5] = a[5];
					out[6] = a[6];
					out[7] = a[7];
					out[8] = a[8];
					return out;
				};

				/**
				 * Set a mat3 to the identity matrix
				 *
				 * @param {mat3} out the receiving matrix
				 * @returns {mat3} out
				 */
				mat3.identity = function (out) {
					out[0] = 1;
					out[1] = 0;
					out[2] = 0;
					out[3] = 0;
					out[4] = 1;
					out[5] = 0;
					out[6] = 0;
					out[7] = 0;
					out[8] = 1;
					return out;
				};

				/**
				 * Transpose the values of a mat3
				 *
				 * @param {mat3} out the receiving matrix
				 * @param {mat3} a the source matrix
				 * @returns {mat3} out
				 */
				mat3.transpose = function (out, a) {
					// If we are transposing ourselves we can skip a few steps but have to cache some values
					if (out === a) {
						var a01 = a[1], a02 = a[2], a12 = a[5];
						out[1] = a[3];
						out[2] = a[6];
						out[3] = a01;
						out[5] = a[7];
						out[6] = a02;
						out[7] = a12;
					} else {
						out[0] = a[0];
						out[1] = a[3];
						out[2] = a[6];
						out[3] = a[1];
						out[4] = a[4];
						out[5] = a[7];
						out[6] = a[2];
						out[7] = a[5];
						out[8] = a[8];
					}

					return out;
				};

				/**
				 * Inverts a mat3
				 *
				 * @param {mat3} out the receiving matrix
				 * @param {mat3} a the source matrix
				 * @returns {mat3} out
				 */
				mat3.invert = function (out, a) {
					var a00 = a[0], a01 = a[1], a02 = a[2],
						a10 = a[3], a11 = a[4], a12 = a[5],
						a20 = a[6], a21 = a[7], a22 = a[8],

						b01 = a22 * a11 - a12 * a21,
						b11 = -a22 * a10 + a12 * a20,
						b21 = a21 * a10 - a11 * a20,

						// Calculate the determinant
						det = a00 * b01 + a01 * b11 + a02 * b21;

					if (!det) {
						return null;
					}
					det = 1.0 / det;

					out[0] = b01 * det;
					out[1] = (-a22 * a01 + a02 * a21) * det;
					out[2] = (a12 * a01 - a02 * a11) * det;
					out[3] = b11 * det;
					out[4] = (a22 * a00 - a02 * a20) * det;
					out[5] = (-a12 * a00 + a02 * a10) * det;
					out[6] = b21 * det;
					out[7] = (-a21 * a00 + a01 * a20) * det;
					out[8] = (a11 * a00 - a01 * a10) * det;
					return out;
				};

				/**
				 * Calculates the adjugate of a mat3
				 *
				 * @param {mat3} out the receiving matrix
				 * @param {mat3} a the source matrix
				 * @returns {mat3} out
				 */
				mat3.adjoint = function (out, a) {
					var a00 = a[0], a01 = a[1], a02 = a[2],
						a10 = a[3], a11 = a[4], a12 = a[5],
						a20 = a[6], a21 = a[7], a22 = a[8];

					out[0] = (a11 * a22 - a12 * a21);
					out[1] = (a02 * a21 - a01 * a22);
					out[2] = (a01 * a12 - a02 * a11);
					out[3] = (a12 * a20 - a10 * a22);
					out[4] = (a00 * a22 - a02 * a20);
					out[5] = (a02 * a10 - a00 * a12);
					out[6] = (a10 * a21 - a11 * a20);
					out[7] = (a01 * a20 - a00 * a21);
					out[8] = (a00 * a11 - a01 * a10);
					return out;
				};

				/**
				 * Calculates the determinant of a mat3
				 *
				 * @param {mat3} a the source matrix
				 * @returns {Number} determinant of a
				 */
				mat3.determinant = function (a) {
					var a00 = a[0], a01 = a[1], a02 = a[2],
						a10 = a[3], a11 = a[4], a12 = a[5],
						a20 = a[6], a21 = a[7], a22 = a[8];

					return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
				};

				/**
				 * Multiplies two mat3's
				 *
				 * @param {mat3} out the receiving matrix
				 * @param {mat3} a the first operand
				 * @param {mat3} b the second operand
				 * @returns {mat3} out
				 */
				mat3.multiply = function (out, a, b) {
					var a00 = a[0], a01 = a[1], a02 = a[2],
						a10 = a[3], a11 = a[4], a12 = a[5],
						a20 = a[6], a21 = a[7], a22 = a[8],

						b00 = b[0], b01 = b[1], b02 = b[2],
						b10 = b[3], b11 = b[4], b12 = b[5],
						b20 = b[6], b21 = b[7], b22 = b[8];

					out[0] = b00 * a00 + b01 * a10 + b02 * a20;
					out[1] = b00 * a01 + b01 * a11 + b02 * a21;
					out[2] = b00 * a02 + b01 * a12 + b02 * a22;

					out[3] = b10 * a00 + b11 * a10 + b12 * a20;
					out[4] = b10 * a01 + b11 * a11 + b12 * a21;
					out[5] = b10 * a02 + b11 * a12 + b12 * a22;

					out[6] = b20 * a00 + b21 * a10 + b22 * a20;
					out[7] = b20 * a01 + b21 * a11 + b22 * a21;
					out[8] = b20 * a02 + b21 * a12 + b22 * a22;
					return out;
				};

				/**
				 * Alias for {@link mat3.multiply}
				 * @function
				 */
				mat3.mul = mat3.multiply;

				/**
				 * Translate a mat3 by the given vector
				 *
				 * @param {mat3} out the receiving matrix
				 * @param {mat3} a the matrix to translate
				 * @param {vec2} v vector to translate by
				 * @returns {mat3} out
				 */
				mat3.translate = function (out, a, v) {
					var a00 = a[0], a01 = a[1], a02 = a[2],
						a10 = a[3], a11 = a[4], a12 = a[5],
						a20 = a[6], a21 = a[7], a22 = a[8],
						x = v[0], y = v[1];

					out[0] = a00;
					out[1] = a01;
					out[2] = a02;

					out[3] = a10;
					out[4] = a11;
					out[5] = a12;

					out[6] = x * a00 + y * a10 + a20;
					out[7] = x * a01 + y * a11 + a21;
					out[8] = x * a02 + y * a12 + a22;
					return out;
				};

				/**
				 * Rotates a mat3 by the given angle
				 *
				 * @param {mat3} out the receiving matrix
				 * @param {mat3} a the matrix to rotate
				 * @param {Number} rad the angle to rotate the matrix by
				 * @returns {mat3} out
				 */
				mat3.rotate = function (out, a, rad) {
					var a00 = a[0], a01 = a[1], a02 = a[2],
						a10 = a[3], a11 = a[4], a12 = a[5],
						a20 = a[6], a21 = a[7], a22 = a[8],

						s = Math.sin(rad),
						c = Math.cos(rad);

					out[0] = c * a00 + s * a10;
					out[1] = c * a01 + s * a11;
					out[2] = c * a02 + s * a12;

					out[3] = c * a10 - s * a00;
					out[4] = c * a11 - s * a01;
					out[5] = c * a12 - s * a02;

					out[6] = a20;
					out[7] = a21;
					out[8] = a22;
					return out;
				};

				/**
				 * Scales the mat3 by the dimensions in the given vec2
				 *
				 * @param {mat3} out the receiving matrix
				 * @param {mat3} a the matrix to rotate
				 * @param {vec2} v the vec2 to scale the matrix by
				 * @returns {mat3} out
				 **/
				mat3.scale = function (out, a, v) {
					var x = v[0], y = v[1];

					out[0] = x * a[0];
					out[1] = x * a[1];
					out[2] = x * a[2];

					out[3] = y * a[3];
					out[4] = y * a[4];
					out[5] = y * a[5];

					out[6] = a[6];
					out[7] = a[7];
					out[8] = a[8];
					return out;
				};

				/**
				 * Creates a matrix from a vector translation
				 * This is equivalent to (but much faster than):
				 *
				 *     mat3.identity(dest);
				 *     mat3.translate(dest, dest, vec);
				 *
				 * @param {mat3} out mat3 receiving operation result
				 * @param {vec2} v Translation vector
				 * @returns {mat3} out
				 */
				mat3.fromTranslation = function (out, v) {
					out[0] = 1;
					out[1] = 0;
					out[2] = 0;
					out[3] = 0;
					out[4] = 1;
					out[5] = 0;
					out[6] = v[0];
					out[7] = v[1];
					out[8] = 1;
					return out;
				}

				/**
				 * Creates a matrix from a given angle
				 * This is equivalent to (but much faster than):
				 *
				 *     mat3.identity(dest);
				 *     mat3.rotate(dest, dest, rad);
				 *
				 * @param {mat3} out mat3 receiving operation result
				 * @param {Number} rad the angle to rotate the matrix by
				 * @returns {mat3} out
				 */
				mat3.fromRotation = function (out, rad) {
					var s = Math.sin(rad), c = Math.cos(rad);

					out[0] = c;
					out[1] = s;
					out[2] = 0;

					out[3] = -s;
					out[4] = c;
					out[5] = 0;

					out[6] = 0;
					out[7] = 0;
					out[8] = 1;
					return out;
				}

				/**
				 * Creates a matrix from a vector scaling
				 * This is equivalent to (but much faster than):
				 *
				 *     mat3.identity(dest);
				 *     mat3.scale(dest, dest, vec);
				 *
				 * @param {mat3} out mat3 receiving operation result
				 * @param {vec2} v Scaling vector
				 * @returns {mat3} out
				 */
				mat3.fromScaling = function (out, v) {
					out[0] = v[0];
					out[1] = 0;
					out[2] = 0;

					out[3] = 0;
					out[4] = v[1];
					out[5] = 0;

					out[6] = 0;
					out[7] = 0;
					out[8] = 1;
					return out;
				}

				/**
				 * Copies the values from a mat2d into a mat3
				 *
				 * @param {mat3} out the receiving matrix
				 * @param {mat2d} a the matrix to copy
				 * @returns {mat3} out
				 **/
				mat3.fromMat2d = function (out, a) {
					out[0] = a[0];
					out[1] = a[1];
					out[2] = 0;

					out[3] = a[2];
					out[4] = a[3];
					out[5] = 0;

					out[6] = a[4];
					out[7] = a[5];
					out[8] = 1;
					return out;
				};

				/**
				* Calculates a 3x3 matrix from the given quaternion
				*
				* @param {mat3} out mat3 receiving operation result
				* @param {quat} q Quaternion to create matrix from
				*
				* @returns {mat3} out
				*/
				mat3.fromQuat = function (out, q) {
					var x = q[0], y = q[1], z = q[2], w = q[3],
						x2 = x + x,
						y2 = y + y,
						z2 = z + z,

						xx = x * x2,
						yx = y * x2,
						yy = y * y2,
						zx = z * x2,
						zy = z * y2,
						zz = z * z2,
						wx = w * x2,
						wy = w * y2,
						wz = w * z2;

					out[0] = 1 - yy - zz;
					out[3] = yx - wz;
					out[6] = zx + wy;

					out[1] = yx + wz;
					out[4] = 1 - xx - zz;
					out[7] = zy - wx;

					out[2] = zx - wy;
					out[5] = zy + wx;
					out[8] = 1 - xx - yy;

					return out;
				};

				/**
				* Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
				*
				* @param {mat3} out mat3 receiving operation result
				* @param {mat4} a Mat4 to derive the normal matrix from
				*
				* @returns {mat3} out
				*/
				mat3.normalFromMat4 = function (out, a) {
					var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
						a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
						a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
						a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

						b00 = a00 * a11 - a01 * a10,
						b01 = a00 * a12 - a02 * a10,
						b02 = a00 * a13 - a03 * a10,
						b03 = a01 * a12 - a02 * a11,
						b04 = a01 * a13 - a03 * a11,
						b05 = a02 * a13 - a03 * a12,
						b06 = a20 * a31 - a21 * a30,
						b07 = a20 * a32 - a22 * a30,
						b08 = a20 * a33 - a23 * a30,
						b09 = a21 * a32 - a22 * a31,
						b10 = a21 * a33 - a23 * a31,
						b11 = a22 * a33 - a23 * a32,

						// Calculate the determinant
						det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

					if (!det) {
						return null;
					}
					det = 1.0 / det;

					out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
					out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
					out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;

					out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
					out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
					out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;

					out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
					out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
					out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;

					return out;
				};

				/**
				 * Returns a string representation of a mat3
				 *
				 * @param {mat3} mat matrix to represent as a string
				 * @returns {String} string representation of the matrix
				 */
				mat3.str = function (a) {
					return 'mat3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' +
						a[3] + ', ' + a[4] + ', ' + a[5] + ', ' +
						a[6] + ', ' + a[7] + ', ' + a[8] + ')';
				};

				/**
				 * Returns Frobenius norm of a mat3
				 *
				 * @param {mat3} a the matrix to calculate Frobenius norm of
				 * @returns {Number} Frobenius norm
				 */
				mat3.frob = function (a) {
					return (Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2)))
				};


				module.exports = mat3;


				/***/
},
/* 5 */
/***/ function (module, exports, __webpack_require__) {

				/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.
			
				Permission is hereby granted, free of charge, to any person obtaining a copy
				of this software and associated documentation files (the "Software"), to deal
				in the Software without restriction, including without limitation the rights
				to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
				copies of the Software, and to permit persons to whom the Software is
				furnished to do so, subject to the following conditions:
			
				The above copyright notice and this permission notice shall be included in
				all copies or substantial portions of the Software.
			
				THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
				IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
				FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
				AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
				LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
				OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
				THE SOFTWARE. */

				var glMatrix = __webpack_require__(1);

				/**
				 * @class 4x4 Matrix
				 * @name mat4
				 */
				var mat4 = {
					scalar: {},
					SIMD: {},
				};

				/**
				 * Creates a new identity mat4
				 *
				 * @returns {mat4} a new 4x4 matrix
				 */
				mat4.create = function () {
					var out = new glMatrix.ARRAY_TYPE(16);
					out[0] = 1;
					out[1] = 0;
					out[2] = 0;
					out[3] = 0;
					out[4] = 0;
					out[5] = 1;
					out[6] = 0;
					out[7] = 0;
					out[8] = 0;
					out[9] = 0;
					out[10] = 1;
					out[11] = 0;
					out[12] = 0;
					out[13] = 0;
					out[14] = 0;
					out[15] = 1;
					return out;
				};

				/**
				 * Creates a new mat4 initialized with values from an existing matrix
				 *
				 * @param {mat4} a matrix to clone
				 * @returns {mat4} a new 4x4 matrix
				 */
				mat4.clone = function (a) {
					var out = new glMatrix.ARRAY_TYPE(16);
					out[0] = a[0];
					out[1] = a[1];
					out[2] = a[2];
					out[3] = a[3];
					out[4] = a[4];
					out[5] = a[5];
					out[6] = a[6];
					out[7] = a[7];
					out[8] = a[8];
					out[9] = a[9];
					out[10] = a[10];
					out[11] = a[11];
					out[12] = a[12];
					out[13] = a[13];
					out[14] = a[14];
					out[15] = a[15];
					return out;
				};

				/**
				 * Copy the values from one mat4 to another
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the source matrix
				 * @returns {mat4} out
				 */
				mat4.copy = function (out, a) {
					out[0] = a[0];
					out[1] = a[1];
					out[2] = a[2];
					out[3] = a[3];
					out[4] = a[4];
					out[5] = a[5];
					out[6] = a[6];
					out[7] = a[7];
					out[8] = a[8];
					out[9] = a[9];
					out[10] = a[10];
					out[11] = a[11];
					out[12] = a[12];
					out[13] = a[13];
					out[14] = a[14];
					out[15] = a[15];
					return out;
				};

				/**
				 * Set a mat4 to the identity matrix
				 *
				 * @param {mat4} out the receiving matrix
				 * @returns {mat4} out
				 */
				mat4.identity = function (out) {
					out[0] = 1;
					out[1] = 0;
					out[2] = 0;
					out[3] = 0;
					out[4] = 0;
					out[5] = 1;
					out[6] = 0;
					out[7] = 0;
					out[8] = 0;
					out[9] = 0;
					out[10] = 1;
					out[11] = 0;
					out[12] = 0;
					out[13] = 0;
					out[14] = 0;
					out[15] = 1;
					return out;
				};

				/**
				 * Transpose the values of a mat4 not using SIMD
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the source matrix
				 * @returns {mat4} out
				 */
				mat4.scalar.transpose = function (out, a) {
					// If we are transposing ourselves we can skip a few steps but have to cache some values
					if (out === a) {
						var a01 = a[1], a02 = a[2], a03 = a[3],
							a12 = a[6], a13 = a[7],
							a23 = a[11];

						out[1] = a[4];
						out[2] = a[8];
						out[3] = a[12];
						out[4] = a01;
						out[6] = a[9];
						out[7] = a[13];
						out[8] = a02;
						out[9] = a12;
						out[11] = a[14];
						out[12] = a03;
						out[13] = a13;
						out[14] = a23;
					} else {
						out[0] = a[0];
						out[1] = a[4];
						out[2] = a[8];
						out[3] = a[12];
						out[4] = a[1];
						out[5] = a[5];
						out[6] = a[9];
						out[7] = a[13];
						out[8] = a[2];
						out[9] = a[6];
						out[10] = a[10];
						out[11] = a[14];
						out[12] = a[3];
						out[13] = a[7];
						out[14] = a[11];
						out[15] = a[15];
					}

					return out;
				};

				/**
				 * Transpose the values of a mat4 using SIMD
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the source matrix
				 * @returns {mat4} out
				 */
				mat4.SIMD.transpose = function (out, a) {
					var a0, a1, a2, a3,
						tmp01, tmp23,
						out0, out1, out2, out3;

					a0 = SIMD.Float32x4.load(a, 0);
					a1 = SIMD.Float32x4.load(a, 4);
					a2 = SIMD.Float32x4.load(a, 8);
					a3 = SIMD.Float32x4.load(a, 12);

					tmp01 = SIMD.Float32x4.shuffle(a0, a1, 0, 1, 4, 5);
					tmp23 = SIMD.Float32x4.shuffle(a2, a3, 0, 1, 4, 5);
					out0 = SIMD.Float32x4.shuffle(tmp01, tmp23, 0, 2, 4, 6);
					out1 = SIMD.Float32x4.shuffle(tmp01, tmp23, 1, 3, 5, 7);
					SIMD.Float32x4.store(out, 0, out0);
					SIMD.Float32x4.store(out, 4, out1);

					tmp01 = SIMD.Float32x4.shuffle(a0, a1, 2, 3, 6, 7);
					tmp23 = SIMD.Float32x4.shuffle(a2, a3, 2, 3, 6, 7);
					out2 = SIMD.Float32x4.shuffle(tmp01, tmp23, 0, 2, 4, 6);
					out3 = SIMD.Float32x4.shuffle(tmp01, tmp23, 1, 3, 5, 7);
					SIMD.Float32x4.store(out, 8, out2);
					SIMD.Float32x4.store(out, 12, out3);

					return out;
				};

				/**
				 * Transpse a mat4 using SIMD if available and enabled
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the source matrix
				 * @returns {mat4} out
				 */
				mat4.transpose = glMatrix.USE_SIMD ? mat4.SIMD.transpose : mat4.scalar.transpose;

				/**
				 * Inverts a mat4 not using SIMD
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the source matrix
				 * @returns {mat4} out
				 */
				mat4.scalar.invert = function (out, a) {
					var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
						a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
						a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
						a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

						b00 = a00 * a11 - a01 * a10,
						b01 = a00 * a12 - a02 * a10,
						b02 = a00 * a13 - a03 * a10,
						b03 = a01 * a12 - a02 * a11,
						b04 = a01 * a13 - a03 * a11,
						b05 = a02 * a13 - a03 * a12,
						b06 = a20 * a31 - a21 * a30,
						b07 = a20 * a32 - a22 * a30,
						b08 = a20 * a33 - a23 * a30,
						b09 = a21 * a32 - a22 * a31,
						b10 = a21 * a33 - a23 * a31,
						b11 = a22 * a33 - a23 * a32,

						// Calculate the determinant
						det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

					if (!det) {
						return null;
					}
					det = 1.0 / det;

					out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
					out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
					out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
					out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
					out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
					out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
					out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
					out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
					out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
					out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
					out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
					out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
					out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
					out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
					out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
					out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

					return out;
				};

				/**
				 * Inverts a mat4 using SIMD
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the source matrix
				 * @returns {mat4} out
				 */
				mat4.SIMD.invert = function (out, a) {
					var row0, row1, row2, row3,
						tmp1,
						minor0, minor1, minor2, minor3,
						det,
						a0 = SIMD.Float32x4.load(a, 0),
						a1 = SIMD.Float32x4.load(a, 4),
						a2 = SIMD.Float32x4.load(a, 8),
						a3 = SIMD.Float32x4.load(a, 12);

					// Compute matrix adjugate
					tmp1 = SIMD.Float32x4.shuffle(a0, a1, 0, 1, 4, 5);
					row1 = SIMD.Float32x4.shuffle(a2, a3, 0, 1, 4, 5);
					row0 = SIMD.Float32x4.shuffle(tmp1, row1, 0, 2, 4, 6);
					row1 = SIMD.Float32x4.shuffle(row1, tmp1, 1, 3, 5, 7);
					tmp1 = SIMD.Float32x4.shuffle(a0, a1, 2, 3, 6, 7);
					row3 = SIMD.Float32x4.shuffle(a2, a3, 2, 3, 6, 7);
					row2 = SIMD.Float32x4.shuffle(tmp1, row3, 0, 2, 4, 6);
					row3 = SIMD.Float32x4.shuffle(row3, tmp1, 1, 3, 5, 7);

					tmp1 = SIMD.Float32x4.mul(row2, row3);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
					minor0 = SIMD.Float32x4.mul(row1, tmp1);
					minor1 = SIMD.Float32x4.mul(row0, tmp1);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
					minor0 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row1, tmp1), minor0);
					minor1 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor1);
					minor1 = SIMD.Float32x4.swizzle(minor1, 2, 3, 0, 1);

					tmp1 = SIMD.Float32x4.mul(row1, row2);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
					minor0 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor0);
					minor3 = SIMD.Float32x4.mul(row0, tmp1);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
					minor0 = SIMD.Float32x4.sub(minor0, SIMD.Float32x4.mul(row3, tmp1));
					minor3 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor3);
					minor3 = SIMD.Float32x4.swizzle(minor3, 2, 3, 0, 1);

					tmp1 = SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(row1, 2, 3, 0, 1), row3);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
					row2 = SIMD.Float32x4.swizzle(row2, 2, 3, 0, 1);
					minor0 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row2, tmp1), minor0);
					minor2 = SIMD.Float32x4.mul(row0, tmp1);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
					minor0 = SIMD.Float32x4.sub(minor0, SIMD.Float32x4.mul(row2, tmp1));
					minor2 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor2);
					minor2 = SIMD.Float32x4.swizzle(minor2, 2, 3, 0, 1);

					tmp1 = SIMD.Float32x4.mul(row0, row1);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
					minor2 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor2);
					minor3 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row2, tmp1), minor3);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
					minor2 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row3, tmp1), minor2);
					minor3 = SIMD.Float32x4.sub(minor3, SIMD.Float32x4.mul(row2, tmp1));

					tmp1 = SIMD.Float32x4.mul(row0, row3);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
					minor1 = SIMD.Float32x4.sub(minor1, SIMD.Float32x4.mul(row2, tmp1));
					minor2 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row1, tmp1), minor2);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
					minor1 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row2, tmp1), minor1);
					minor2 = SIMD.Float32x4.sub(minor2, SIMD.Float32x4.mul(row1, tmp1));

					tmp1 = SIMD.Float32x4.mul(row0, row2);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
					minor1 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor1);
					minor3 = SIMD.Float32x4.sub(minor3, SIMD.Float32x4.mul(row1, tmp1));
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
					minor1 = SIMD.Float32x4.sub(minor1, SIMD.Float32x4.mul(row3, tmp1));
					minor3 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row1, tmp1), minor3);

					// Compute matrix determinant
					det = SIMD.Float32x4.mul(row0, minor0);
					det = SIMD.Float32x4.add(SIMD.Float32x4.swizzle(det, 2, 3, 0, 1), det);
					det = SIMD.Float32x4.add(SIMD.Float32x4.swizzle(det, 1, 0, 3, 2), det);
					tmp1 = SIMD.Float32x4.reciprocalApproximation(det);
					det = SIMD.Float32x4.sub(
						SIMD.Float32x4.add(tmp1, tmp1),
						SIMD.Float32x4.mul(det, SIMD.Float32x4.mul(tmp1, tmp1)));
					det = SIMD.Float32x4.swizzle(det, 0, 0, 0, 0);
					if (!det) {
						return null;
					}

					// Compute matrix inverse
					SIMD.Float32x4.store(out, 0, SIMD.Float32x4.mul(det, minor0));
					SIMD.Float32x4.store(out, 4, SIMD.Float32x4.mul(det, minor1));
					SIMD.Float32x4.store(out, 8, SIMD.Float32x4.mul(det, minor2));
					SIMD.Float32x4.store(out, 12, SIMD.Float32x4.mul(det, minor3));
					return out;
				}

				/**
				 * Inverts a mat4 using SIMD if available and enabled
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the source matrix
				 * @returns {mat4} out
				 */
				mat4.invert = glMatrix.USE_SIMD ? mat4.SIMD.invert : mat4.scalar.invert;

				/**
				 * Calculates the adjugate of a mat4 not using SIMD
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the source matrix
				 * @returns {mat4} out
				 */
				mat4.scalar.adjoint = function (out, a) {
					var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
						a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
						a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
						a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

					out[0] = (a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22));
					out[1] = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
					out[2] = (a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12));
					out[3] = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
					out[4] = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
					out[5] = (a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22));
					out[6] = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
					out[7] = (a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12));
					out[8] = (a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21));
					out[9] = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
					out[10] = (a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11));
					out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
					out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
					out[13] = (a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21));
					out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
					out[15] = (a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11));
					return out;
				};

				/**
				 * Calculates the adjugate of a mat4 using SIMD
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the source matrix
				 * @returns {mat4} out
				 */
				mat4.SIMD.adjoint = function (out, a) {
					var a0, a1, a2, a3;
					var row0, row1, row2, row3;
					var tmp1;
					var minor0, minor1, minor2, minor3;

					var a0 = SIMD.Float32x4.load(a, 0);
					var a1 = SIMD.Float32x4.load(a, 4);
					var a2 = SIMD.Float32x4.load(a, 8);
					var a3 = SIMD.Float32x4.load(a, 12);

					// Transpose the source matrix.  Sort of.  Not a true transpose operation
					tmp1 = SIMD.Float32x4.shuffle(a0, a1, 0, 1, 4, 5);
					row1 = SIMD.Float32x4.shuffle(a2, a3, 0, 1, 4, 5);
					row0 = SIMD.Float32x4.shuffle(tmp1, row1, 0, 2, 4, 6);
					row1 = SIMD.Float32x4.shuffle(row1, tmp1, 1, 3, 5, 7);

					tmp1 = SIMD.Float32x4.shuffle(a0, a1, 2, 3, 6, 7);
					row3 = SIMD.Float32x4.shuffle(a2, a3, 2, 3, 6, 7);
					row2 = SIMD.Float32x4.shuffle(tmp1, row3, 0, 2, 4, 6);
					row3 = SIMD.Float32x4.shuffle(row3, tmp1, 1, 3, 5, 7);

					tmp1 = SIMD.Float32x4.mul(row2, row3);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
					minor0 = SIMD.Float32x4.mul(row1, tmp1);
					minor1 = SIMD.Float32x4.mul(row0, tmp1);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
					minor0 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row1, tmp1), minor0);
					minor1 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor1);
					minor1 = SIMD.Float32x4.swizzle(minor1, 2, 3, 0, 1);

					tmp1 = SIMD.Float32x4.mul(row1, row2);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
					minor0 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor0);
					minor3 = SIMD.Float32x4.mul(row0, tmp1);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
					minor0 = SIMD.Float32x4.sub(minor0, SIMD.Float32x4.mul(row3, tmp1));
					minor3 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor3);
					minor3 = SIMD.Float32x4.swizzle(minor3, 2, 3, 0, 1);

					tmp1 = SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(row1, 2, 3, 0, 1), row3);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
					row2 = SIMD.Float32x4.swizzle(row2, 2, 3, 0, 1);
					minor0 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row2, tmp1), minor0);
					minor2 = SIMD.Float32x4.mul(row0, tmp1);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
					minor0 = SIMD.Float32x4.sub(minor0, SIMD.Float32x4.mul(row2, tmp1));
					minor2 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor2);
					minor2 = SIMD.Float32x4.swizzle(minor2, 2, 3, 0, 1);

					tmp1 = SIMD.Float32x4.mul(row0, row1);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
					minor2 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor2);
					minor3 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row2, tmp1), minor3);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
					minor2 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row3, tmp1), minor2);
					minor3 = SIMD.Float32x4.sub(minor3, SIMD.Float32x4.mul(row2, tmp1));

					tmp1 = SIMD.Float32x4.mul(row0, row3);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
					minor1 = SIMD.Float32x4.sub(minor1, SIMD.Float32x4.mul(row2, tmp1));
					minor2 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row1, tmp1), minor2);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
					minor1 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row2, tmp1), minor1);
					minor2 = SIMD.Float32x4.sub(minor2, SIMD.Float32x4.mul(row1, tmp1));

					tmp1 = SIMD.Float32x4.mul(row0, row2);
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
					minor1 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor1);
					minor3 = SIMD.Float32x4.sub(minor3, SIMD.Float32x4.mul(row1, tmp1));
					tmp1 = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
					minor1 = SIMD.Float32x4.sub(minor1, SIMD.Float32x4.mul(row3, tmp1));
					minor3 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row1, tmp1), minor3);

					SIMD.Float32x4.store(out, 0, minor0);
					SIMD.Float32x4.store(out, 4, minor1);
					SIMD.Float32x4.store(out, 8, minor2);
					SIMD.Float32x4.store(out, 12, minor3);
					return out;
				};

				/**
				 * Calculates the adjugate of a mat4 using SIMD if available and enabled
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the source matrix
				 * @returns {mat4} out
				 */
				mat4.adjoint = glMatrix.USE_SIMD ? mat4.SIMD.adjoint : mat4.scalar.adjoint;

				/**
				 * Calculates the determinant of a mat4
				 *
				 * @param {mat4} a the source matrix
				 * @returns {Number} determinant of a
				 */
				mat4.determinant = function (a) {
					var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
						a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
						a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
						a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

						b00 = a00 * a11 - a01 * a10,
						b01 = a00 * a12 - a02 * a10,
						b02 = a00 * a13 - a03 * a10,
						b03 = a01 * a12 - a02 * a11,
						b04 = a01 * a13 - a03 * a11,
						b05 = a02 * a13 - a03 * a12,
						b06 = a20 * a31 - a21 * a30,
						b07 = a20 * a32 - a22 * a30,
						b08 = a20 * a33 - a23 * a30,
						b09 = a21 * a32 - a22 * a31,
						b10 = a21 * a33 - a23 * a31,
						b11 = a22 * a33 - a23 * a32;

					// Calculate the determinant
					return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
				};

				/**
				 * Multiplies two mat4's explicitly using SIMD
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the first operand, must be a Float32Array
				 * @param {mat4} b the second operand, must be a Float32Array
				 * @returns {mat4} out
				 */
				mat4.SIMD.multiply = function (out, a, b) {
					var a0 = SIMD.Float32x4.load(a, 0);
					var a1 = SIMD.Float32x4.load(a, 4);
					var a2 = SIMD.Float32x4.load(a, 8);
					var a3 = SIMD.Float32x4.load(a, 12);

					var b0 = SIMD.Float32x4.load(b, 0);
					var out0 = SIMD.Float32x4.add(
						SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b0, 0, 0, 0, 0), a0),
						SIMD.Float32x4.add(
							SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b0, 1, 1, 1, 1), a1),
							SIMD.Float32x4.add(
								SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b0, 2, 2, 2, 2), a2),
								SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b0, 3, 3, 3, 3), a3))));
					SIMD.Float32x4.store(out, 0, out0);

					var b1 = SIMD.Float32x4.load(b, 4);
					var out1 = SIMD.Float32x4.add(
						SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b1, 0, 0, 0, 0), a0),
						SIMD.Float32x4.add(
							SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b1, 1, 1, 1, 1), a1),
							SIMD.Float32x4.add(
								SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b1, 2, 2, 2, 2), a2),
								SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b1, 3, 3, 3, 3), a3))));
					SIMD.Float32x4.store(out, 4, out1);

					var b2 = SIMD.Float32x4.load(b, 8);
					var out2 = SIMD.Float32x4.add(
						SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b2, 0, 0, 0, 0), a0),
						SIMD.Float32x4.add(
							SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b2, 1, 1, 1, 1), a1),
							SIMD.Float32x4.add(
								SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b2, 2, 2, 2, 2), a2),
								SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b2, 3, 3, 3, 3), a3))));
					SIMD.Float32x4.store(out, 8, out2);

					var b3 = SIMD.Float32x4.load(b, 12);
					var out3 = SIMD.Float32x4.add(
						SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b3, 0, 0, 0, 0), a0),
						SIMD.Float32x4.add(
							SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b3, 1, 1, 1, 1), a1),
							SIMD.Float32x4.add(
								SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b3, 2, 2, 2, 2), a2),
								SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b3, 3, 3, 3, 3), a3))));
					SIMD.Float32x4.store(out, 12, out3);

					return out;
				};

				/**
				 * Multiplies two mat4's explicitly not using SIMD
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the first operand
				 * @param {mat4} b the second operand
				 * @returns {mat4} out
				 */
				mat4.scalar.multiply = function (out, a, b) {
					var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
						a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
						a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
						a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

					// Cache only the current line of the second matrix
					var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
					out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
					out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
					out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
					out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

					b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
					out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
					out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
					out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
					out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

					b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
					out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
					out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
					out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
					out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

					b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
					out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
					out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
					out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
					out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
					return out;
				};

				/**
				 * Multiplies two mat4's using SIMD if available and enabled
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the first operand
				 * @param {mat4} b the second operand
				 * @returns {mat4} out
				 */
				mat4.multiply = glMatrix.USE_SIMD ? mat4.SIMD.multiply : mat4.scalar.multiply;

				/**
				 * Alias for {@link mat4.multiply}
				 * @function
				 */
				mat4.mul = mat4.multiply;

				/**
				 * Translate a mat4 by the given vector not using SIMD
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the matrix to translate
				 * @param {vec3} v vector to translate by
				 * @returns {mat4} out
				 */
				mat4.scalar.translate = function (out, a, v) {
					var x = v[0], y = v[1], z = v[2],
						a00, a01, a02, a03,
						a10, a11, a12, a13,
						a20, a21, a22, a23;

					if (a === out) {
						out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
						out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
						out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
						out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
					} else {
						a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
						a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
						a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

						out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
						out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
						out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;

						out[12] = a00 * x + a10 * y + a20 * z + a[12];
						out[13] = a01 * x + a11 * y + a21 * z + a[13];
						out[14] = a02 * x + a12 * y + a22 * z + a[14];
						out[15] = a03 * x + a13 * y + a23 * z + a[15];
					}

					return out;
				};

				/**
				 * Translates a mat4 by the given vector using SIMD
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the matrix to translate
				 * @param {vec3} v vector to translate by
				 * @returns {mat4} out
				 */
				mat4.SIMD.translate = function (out, a, v) {
					var a0 = SIMD.Float32x4.load(a, 0),
						a1 = SIMD.Float32x4.load(a, 4),
						a2 = SIMD.Float32x4.load(a, 8),
						a3 = SIMD.Float32x4.load(a, 12),
						vec = SIMD.Float32x4(v[0], v[1], v[2], 0);

					if (a !== out) {
						out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
						out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
						out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
					}

					a0 = SIMD.Float32x4.mul(a0, SIMD.Float32x4.swizzle(vec, 0, 0, 0, 0));
					a1 = SIMD.Float32x4.mul(a1, SIMD.Float32x4.swizzle(vec, 1, 1, 1, 1));
					a2 = SIMD.Float32x4.mul(a2, SIMD.Float32x4.swizzle(vec, 2, 2, 2, 2));

					var t0 = SIMD.Float32x4.add(a0, SIMD.Float32x4.add(a1, SIMD.Float32x4.add(a2, a3)));
					SIMD.Float32x4.store(out, 12, t0);

					return out;
				};

				/**
				 * Translates a mat4 by the given vector using SIMD if available and enabled
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the matrix to translate
				 * @param {vec3} v vector to translate by
				 * @returns {mat4} out
				 */
				mat4.translate = glMatrix.USE_SIMD ? mat4.SIMD.translate : mat4.scalar.translate;

				/**
				 * Scales the mat4 by the dimensions in the given vec3 not using vectorization
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the matrix to scale
				 * @param {vec3} v the vec3 to scale the matrix by
				 * @returns {mat4} out
				 **/
				mat4.scalar.scale = function (out, a, v) {
					var x = v[0], y = v[1], z = v[2];

					out[0] = a[0] * x;
					out[1] = a[1] * x;
					out[2] = a[2] * x;
					out[3] = a[3] * x;
					out[4] = a[4] * y;
					out[5] = a[5] * y;
					out[6] = a[6] * y;
					out[7] = a[7] * y;
					out[8] = a[8] * z;
					out[9] = a[9] * z;
					out[10] = a[10] * z;
					out[11] = a[11] * z;
					out[12] = a[12];
					out[13] = a[13];
					out[14] = a[14];
					out[15] = a[15];
					return out;
				};

				/**
				 * Scales the mat4 by the dimensions in the given vec3 using vectorization
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the matrix to scale
				 * @param {vec3} v the vec3 to scale the matrix by
				 * @returns {mat4} out
				 **/
				mat4.SIMD.scale = function (out, a, v) {
					var a0, a1, a2;
					var vec = SIMD.Float32x4(v[0], v[1], v[2], 0);

					a0 = SIMD.Float32x4.load(a, 0);
					SIMD.Float32x4.store(
						out, 0, SIMD.Float32x4.mul(a0, SIMD.Float32x4.swizzle(vec, 0, 0, 0, 0)));

					a1 = SIMD.Float32x4.load(a, 4);
					SIMD.Float32x4.store(
						out, 4, SIMD.Float32x4.mul(a1, SIMD.Float32x4.swizzle(vec, 1, 1, 1, 1)));

					a2 = SIMD.Float32x4.load(a, 8);
					SIMD.Float32x4.store(
						out, 8, SIMD.Float32x4.mul(a2, SIMD.Float32x4.swizzle(vec, 2, 2, 2, 2)));

					out[12] = a[12];
					out[13] = a[13];
					out[14] = a[14];
					out[15] = a[15];
					return out;
				};

				/**
				 * Scales the mat4 by the dimensions in the given vec3 using SIMD if available and enabled
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the matrix to scale
				 * @param {vec3} v the vec3 to scale the matrix by
				 * @returns {mat4} out
				 */
				mat4.scale = glMatrix.USE_SIMD ? mat4.SIMD.scale : mat4.scalar.scale;

				/**
				 * Rotates a mat4 by the given angle around the given axis
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the matrix to rotate
				 * @param {Number} rad the angle to rotate the matrix by
				 * @param {vec3} axis the axis to rotate around
				 * @returns {mat4} out
				 */
				mat4.rotate = function (out, a, rad, axis) {
					var x = axis[0], y = axis[1], z = axis[2],
						len = Math.sqrt(x * x + y * y + z * z),
						s, c, t,
						a00, a01, a02, a03,
						a10, a11, a12, a13,
						a20, a21, a22, a23,
						b00, b01, b02,
						b10, b11, b12,
						b20, b21, b22;

					if (Math.abs(len) < glMatrix.EPSILON) { return null; }

					len = 1 / len;
					x *= len;
					y *= len;
					z *= len;

					s = Math.sin(rad);
					c = Math.cos(rad);
					t = 1 - c;

					a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
					a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
					a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

					// Construct the elements of the rotation matrix
					b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
					b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
					b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

					// Perform rotation-specific matrix multiplication
					out[0] = a00 * b00 + a10 * b01 + a20 * b02;
					out[1] = a01 * b00 + a11 * b01 + a21 * b02;
					out[2] = a02 * b00 + a12 * b01 + a22 * b02;
					out[3] = a03 * b00 + a13 * b01 + a23 * b02;
					out[4] = a00 * b10 + a10 * b11 + a20 * b12;
					out[5] = a01 * b10 + a11 * b11 + a21 * b12;
					out[6] = a02 * b10 + a12 * b11 + a22 * b12;
					out[7] = a03 * b10 + a13 * b11 + a23 * b12;
					out[8] = a00 * b20 + a10 * b21 + a20 * b22;
					out[9] = a01 * b20 + a11 * b21 + a21 * b22;
					out[10] = a02 * b20 + a12 * b21 + a22 * b22;
					out[11] = a03 * b20 + a13 * b21 + a23 * b22;

					if (a !== out) { // If the source and destination differ, copy the unchanged last row
						out[12] = a[12];
						out[13] = a[13];
						out[14] = a[14];
						out[15] = a[15];
					}
					return out;
				};

				/**
				 * Rotates a matrix by the given angle around the X axis not using SIMD
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the matrix to rotate
				 * @param {Number} rad the angle to rotate the matrix by
				 * @returns {mat4} out
				 */
				mat4.scalar.rotateX = function (out, a, rad) {
					var s = Math.sin(rad),
						c = Math.cos(rad),
						a10 = a[4],
						a11 = a[5],
						a12 = a[6],
						a13 = a[7],
						a20 = a[8],
						a21 = a[9],
						a22 = a[10],
						a23 = a[11];

					if (a !== out) { // If the source and destination differ, copy the unchanged rows
						out[0] = a[0];
						out[1] = a[1];
						out[2] = a[2];
						out[3] = a[3];
						out[12] = a[12];
						out[13] = a[13];
						out[14] = a[14];
						out[15] = a[15];
					}

					// Perform axis-specific matrix multiplication
					out[4] = a10 * c + a20 * s;
					out[5] = a11 * c + a21 * s;
					out[6] = a12 * c + a22 * s;
					out[7] = a13 * c + a23 * s;
					out[8] = a20 * c - a10 * s;
					out[9] = a21 * c - a11 * s;
					out[10] = a22 * c - a12 * s;
					out[11] = a23 * c - a13 * s;
					return out;
				};

				/**
				 * Rotates a matrix by the given angle around the X axis using SIMD
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the matrix to rotate
				 * @param {Number} rad the angle to rotate the matrix by
				 * @returns {mat4} out
				 */
				mat4.SIMD.rotateX = function (out, a, rad) {
					var s = SIMD.Float32x4.splat(Math.sin(rad)),
						c = SIMD.Float32x4.splat(Math.cos(rad));

					if (a !== out) { // If the source and destination differ, copy the unchanged rows
						out[0] = a[0];
						out[1] = a[1];
						out[2] = a[2];
						out[3] = a[3];
						out[12] = a[12];
						out[13] = a[13];
						out[14] = a[14];
						out[15] = a[15];
					}

					// Perform axis-specific matrix multiplication
					var a_1 = SIMD.Float32x4.load(a, 4);
					var a_2 = SIMD.Float32x4.load(a, 8);
					SIMD.Float32x4.store(out, 4,
						SIMD.Float32x4.add(SIMD.Float32x4.mul(a_1, c), SIMD.Float32x4.mul(a_2, s)));
					SIMD.Float32x4.store(out, 8,
						SIMD.Float32x4.sub(SIMD.Float32x4.mul(a_2, c), SIMD.Float32x4.mul(a_1, s)));
					return out;
				};

				/**
				 * Rotates a matrix by the given angle around the X axis using SIMD if availabe and enabled
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the matrix to rotate
				 * @param {Number} rad the angle to rotate the matrix by
				 * @returns {mat4} out
				 */
				mat4.rotateX = glMatrix.USE_SIMD ? mat4.SIMD.rotateX : mat4.scalar.rotateX;

				/**
				 * Rotates a matrix by the given angle around the Y axis not using SIMD
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the matrix to rotate
				 * @param {Number} rad the angle to rotate the matrix by
				 * @returns {mat4} out
				 */
				mat4.scalar.rotateY = function (out, a, rad) {
					var s = Math.sin(rad),
						c = Math.cos(rad),
						a00 = a[0],
						a01 = a[1],
						a02 = a[2],
						a03 = a[3],
						a20 = a[8],
						a21 = a[9],
						a22 = a[10],
						a23 = a[11];

					if (a !== out) { // If the source and destination differ, copy the unchanged rows
						out[4] = a[4];
						out[5] = a[5];
						out[6] = a[6];
						out[7] = a[7];
						out[12] = a[12];
						out[13] = a[13];
						out[14] = a[14];
						out[15] = a[15];
					}

					// Perform axis-specific matrix multiplication
					out[0] = a00 * c - a20 * s;
					out[1] = a01 * c - a21 * s;
					out[2] = a02 * c - a22 * s;
					out[3] = a03 * c - a23 * s;
					out[8] = a00 * s + a20 * c;
					out[9] = a01 * s + a21 * c;
					out[10] = a02 * s + a22 * c;
					out[11] = a03 * s + a23 * c;
					return out;
				};

				/**
				 * Rotates a matrix by the given angle around the Y axis using SIMD
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the matrix to rotate
				 * @param {Number} rad the angle to rotate the matrix by
				 * @returns {mat4} out
				 */
				mat4.SIMD.rotateY = function (out, a, rad) {
					var s = SIMD.Float32x4.splat(Math.sin(rad)),
						c = SIMD.Float32x4.splat(Math.cos(rad));

					if (a !== out) { // If the source and destination differ, copy the unchanged rows
						out[4] = a[4];
						out[5] = a[5];
						out[6] = a[6];
						out[7] = a[7];
						out[12] = a[12];
						out[13] = a[13];
						out[14] = a[14];
						out[15] = a[15];
					}

					// Perform axis-specific matrix multiplication
					var a_0 = SIMD.Float32x4.load(a, 0);
					var a_2 = SIMD.Float32x4.load(a, 8);
					SIMD.Float32x4.store(out, 0,
						SIMD.Float32x4.sub(SIMD.Float32x4.mul(a_0, c), SIMD.Float32x4.mul(a_2, s)));
					SIMD.Float32x4.store(out, 8,
						SIMD.Float32x4.add(SIMD.Float32x4.mul(a_0, s), SIMD.Float32x4.mul(a_2, c)));
					return out;
				};

				/**
				 * Rotates a matrix by the given angle around the Y axis if SIMD available and enabled
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the matrix to rotate
				 * @param {Number} rad the angle to rotate the matrix by
				 * @returns {mat4} out
				 */
				mat4.rotateY = glMatrix.USE_SIMD ? mat4.SIMD.rotateY : mat4.scalar.rotateY;

				/**
				 * Rotates a matrix by the given angle around the Z axis not using SIMD
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the matrix to rotate
				 * @param {Number} rad the angle to rotate the matrix by
				 * @returns {mat4} out
				 */
				mat4.scalar.rotateZ = function (out, a, rad) {
					var s = Math.sin(rad),
						c = Math.cos(rad),
						a00 = a[0],
						a01 = a[1],
						a02 = a[2],
						a03 = a[3],
						a10 = a[4],
						a11 = a[5],
						a12 = a[6],
						a13 = a[7];

					if (a !== out) { // If the source and destination differ, copy the unchanged last row
						out[8] = a[8];
						out[9] = a[9];
						out[10] = a[10];
						out[11] = a[11];
						out[12] = a[12];
						out[13] = a[13];
						out[14] = a[14];
						out[15] = a[15];
					}

					// Perform axis-specific matrix multiplication
					out[0] = a00 * c + a10 * s;
					out[1] = a01 * c + a11 * s;
					out[2] = a02 * c + a12 * s;
					out[3] = a03 * c + a13 * s;
					out[4] = a10 * c - a00 * s;
					out[5] = a11 * c - a01 * s;
					out[6] = a12 * c - a02 * s;
					out[7] = a13 * c - a03 * s;
					return out;
				};

				/**
				 * Rotates a matrix by the given angle around the Z axis using SIMD
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the matrix to rotate
				 * @param {Number} rad the angle to rotate the matrix by
				 * @returns {mat4} out
				 */
				mat4.SIMD.rotateZ = function (out, a, rad) {
					var s = SIMD.Float32x4.splat(Math.sin(rad)),
						c = SIMD.Float32x4.splat(Math.cos(rad));

					if (a !== out) { // If the source and destination differ, copy the unchanged last row
						out[8] = a[8];
						out[9] = a[9];
						out[10] = a[10];
						out[11] = a[11];
						out[12] = a[12];
						out[13] = a[13];
						out[14] = a[14];
						out[15] = a[15];
					}

					// Perform axis-specific matrix multiplication
					var a_0 = SIMD.Float32x4.load(a, 0);
					var a_1 = SIMD.Float32x4.load(a, 4);
					SIMD.Float32x4.store(out, 0,
						SIMD.Float32x4.add(SIMD.Float32x4.mul(a_0, c), SIMD.Float32x4.mul(a_1, s)));
					SIMD.Float32x4.store(out, 4,
						SIMD.Float32x4.sub(SIMD.Float32x4.mul(a_1, c), SIMD.Float32x4.mul(a_0, s)));
					return out;
				};

				/**
				 * Rotates a matrix by the given angle around the Z axis if SIMD available and enabled
				 *
				 * @param {mat4} out the receiving matrix
				 * @param {mat4} a the matrix to rotate
				 * @param {Number} rad the angle to rotate the matrix by
				 * @returns {mat4} out
				 */
				mat4.rotateZ = glMatrix.USE_SIMD ? mat4.SIMD.rotateZ : mat4.scalar.rotateZ;

				/**
				 * Creates a matrix from a vector translation
				 * This is equivalent to (but much faster than):
				 *
				 *     mat4.identity(dest);
				 *     mat4.translate(dest, dest, vec);
				 *
				 * @param {mat4} out mat4 receiving operation result
				 * @param {vec3} v Translation vector
				 * @returns {mat4} out
				 */
				mat4.fromTranslation = function (out, v) {
					out[0] = 1;
					out[1] = 0;
					out[2] = 0;
					out[3] = 0;
					out[4] = 0;
					out[5] = 1;
					out[6] = 0;
					out[7] = 0;
					out[8] = 0;
					out[9] = 0;
					out[10] = 1;
					out[11] = 0;
					out[12] = v[0];
					out[13] = v[1];
					out[14] = v[2];
					out[15] = 1;
					return out;
				}

				/**
				 * Creates a matrix from a vector scaling
				 * This is equivalent to (but much faster than):
				 *
				 *     mat4.identity(dest);
				 *     mat4.scale(dest, dest, vec);
				 *
				 * @param {mat4} out mat4 receiving operation result
				 * @param {vec3} v Scaling vector
				 * @returns {mat4} out
				 */
				mat4.fromScaling = function (out, v) {
					out[0] = v[0];
					out[1] = 0;
					out[2] = 0;
					out[3] = 0;
					out[4] = 0;
					out[5] = v[1];
					out[6] = 0;
					out[7] = 0;
					out[8] = 0;
					out[9] = 0;
					out[10] = v[2];
					out[11] = 0;
					out[12] = 0;
					out[13] = 0;
					out[14] = 0;
					out[15] = 1;
					return out;
				}

				/**
				 * Creates a matrix from a given angle around a given axis
				 * This is equivalent to (but much faster than):
				 *
				 *     mat4.identity(dest);
				 *     mat4.rotate(dest, dest, rad, axis);
				 *
				 * @param {mat4} out mat4 receiving operation result
				 * @param {Number} rad the angle to rotate the matrix by
				 * @param {vec3} axis the axis to rotate around
				 * @returns {mat4} out
				 */
				mat4.fromRotation = function (out, rad, axis) {
					var x = axis[0], y = axis[1], z = axis[2],
						len = Math.sqrt(x * x + y * y + z * z),
						s, c, t;

					if (Math.abs(len) < glMatrix.EPSILON) { return null; }

					len = 1 / len;
					x *= len;
					y *= len;
					z *= len;

					s = Math.sin(rad);
					c = Math.cos(rad);
					t = 1 - c;

					// Perform rotation-specific matrix multiplication
					out[0] = x * x * t + c;
					out[1] = y * x * t + z * s;
					out[2] = z * x * t - y * s;
					out[3] = 0;
					out[4] = x * y * t - z * s;
					out[5] = y * y * t + c;
					out[6] = z * y * t + x * s;
					out[7] = 0;
					out[8] = x * z * t + y * s;
					out[9] = y * z * t - x * s;
					out[10] = z * z * t + c;
					out[11] = 0;
					out[12] = 0;
					out[13] = 0;
					out[14] = 0;
					out[15] = 1;
					return out;
				}

				/**
				 * Creates a matrix from the given angle around the X axis
				 * This is equivalent to (but much faster than):
				 *
				 *     mat4.identity(dest);
				 *     mat4.rotateX(dest, dest, rad);
				 *
				 * @param {mat4} out mat4 receiving operation result
				 * @param {Number} rad the angle to rotate the matrix by
				 * @returns {mat4} out
				 */
				mat4.fromXRotation = function (out, rad) {
					var s = Math.sin(rad),
						c = Math.cos(rad);

					// Perform axis-specific matrix multiplication
					out[0] = 1;
					out[1] = 0;
					out[2] = 0;
					out[3] = 0;
					out[4] = 0;
					out[5] = c;
					out[6] = s;
					out[7] = 0;
					out[8] = 0;
					out[9] = -s;
					out[10] = c;
					out[11] = 0;
					out[12] = 0;
					out[13] = 0;
					out[14] = 0;
					out[15] = 1;
					return out;
				}

				/**
				 * Creates a matrix from the given angle around the Y axis
				 * This is equivalent to (but much faster than):
				 *
				 *     mat4.identity(dest);
				 *     mat4.rotateY(dest, dest, rad);
				 *
				 * @param {mat4} out mat4 receiving operation result
				 * @param {Number} rad the angle to rotate the matrix by
				 * @returns {mat4} out
				 */
				mat4.fromYRotation = function (out, rad) {
					var s = Math.sin(rad),
						c = Math.cos(rad);

					// Perform axis-specific matrix multiplication
					out[0] = c;
					out[1] = 0;
					out[2] = -s;
					out[3] = 0;
					out[4] = 0;
					out[5] = 1;
					out[6] = 0;
					out[7] = 0;
					out[8] = s;
					out[9] = 0;
					out[10] = c;
					out[11] = 0;
					out[12] = 0;
					out[13] = 0;
					out[14] = 0;
					out[15] = 1;
					return out;
				}

				/**
				 * Creates a matrix from the given angle around the Z axis
				 * This is equivalent to (but much faster than):
				 *
				 *     mat4.identity(dest);
				 *     mat4.rotateZ(dest, dest, rad);
				 *
				 * @param {mat4} out mat4 receiving operation result
				 * @param {Number} rad the angle to rotate the matrix by
				 * @returns {mat4} out
				 */
				mat4.fromZRotation = function (out, rad) {
					var s = Math.sin(rad),
						c = Math.cos(rad);

					// Perform axis-specific matrix multiplication
					out[0] = c;
					out[1] = s;
					out[2] = 0;
					out[3] = 0;
					out[4] = -s;
					out[5] = c;
					out[6] = 0;
					out[7] = 0;
					out[8] = 0;
					out[9] = 0;
					out[10] = 1;
					out[11] = 0;
					out[12] = 0;
					out[13] = 0;
					out[14] = 0;
					out[15] = 1;
					return out;
				}

				/**
				 * Creates a matrix from a quaternion rotation and vector translation
				 * This is equivalent to (but much faster than):
				 *
				 *     mat4.identity(dest);
				 *     mat4.translate(dest, vec);
				 *     var quatMat = mat4.create();
				 *     quat4.toMat4(quat, quatMat);
				 *     mat4.multiply(dest, quatMat);
				 *
				 * @param {mat4} out mat4 receiving operation result
				 * @param {quat4} q Rotation quaternion
				 * @param {vec3} v Translation vector
				 * @returns {mat4} out
				 */
				mat4.fromRotationTranslation = function (out, q, v) {
					// Quaternion math
					var x = q[0], y = q[1], z = q[2], w = q[3],
						x2 = x + x,
						y2 = y + y,
						z2 = z + z,

						xx = x * x2,
						xy = x * y2,
						xz = x * z2,
						yy = y * y2,
						yz = y * z2,
						zz = z * z2,
						wx = w * x2,
						wy = w * y2,
						wz = w * z2;

					out[0] = 1 - (yy + zz);
					out[1] = xy + wz;
					out[2] = xz - wy;
					out[3] = 0;
					out[4] = xy - wz;
					out[5] = 1 - (xx + zz);
					out[6] = yz + wx;
					out[7] = 0;
					out[8] = xz + wy;
					out[9] = yz - wx;
					out[10] = 1 - (xx + yy);
					out[11] = 0;
					out[12] = v[0];
					out[13] = v[1];
					out[14] = v[2];
					out[15] = 1;

					return out;
				};

				/**
				 * Creates a matrix from a quaternion rotation, vector translation and vector scale
				 * This is equivalent to (but much faster than):
				 *
				 *     mat4.identity(dest);
				 *     mat4.translate(dest, vec);
				 *     var quatMat = mat4.create();
				 *     quat4.toMat4(quat, quatMat);
				 *     mat4.multiply(dest, quatMat);
				 *     mat4.scale(dest, scale)
				 *
				 * @param {mat4} out mat4 receiving operation result
				 * @param {quat4} q Rotation quaternion
				 * @param {vec3} v Translation vector
				 * @param {vec3} s Scaling vector
				 * @returns {mat4} out
				 */
				mat4.fromRotationTranslationScale = function (out, q, v, s) {
					// Quaternion math
					var x = q[0], y = q[1], z = q[2], w = q[3],
						x2 = x + x,
						y2 = y + y,
						z2 = z + z,

						xx = x * x2,
						xy = x * y2,
						xz = x * z2,
						yy = y * y2,
						yz = y * z2,
						zz = z * z2,
						wx = w * x2,
						wy = w * y2,
						wz = w * z2,
						sx = s[0],
						sy = s[1],
						sz = s[2];

					out[0] = (1 - (yy + zz)) * sx;
					out[1] = (xy + wz) * sx;
					out[2] = (xz - wy) * sx;
					out[3] = 0;
					out[4] = (xy - wz) * sy;
					out[5] = (1 - (xx + zz)) * sy;
					out[6] = (yz + wx) * sy;
					out[7] = 0;
					out[8] = (xz + wy) * sz;
					out[9] = (yz - wx) * sz;
					out[10] = (1 - (xx + yy)) * sz;
					out[11] = 0;
					out[12] = v[0];
					out[13] = v[1];
					out[14] = v[2];
					out[15] = 1;

					return out;
				};

				/**
				 * Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the given origin
				 * This is equivalent to (but much faster than):
				 *
				 *     mat4.identity(dest);
				 *     mat4.translate(dest, vec);
				 *     mat4.translate(dest, origin);
				 *     var quatMat = mat4.create();
				 *     quat4.toMat4(quat, quatMat);
				 *     mat4.multiply(dest, quatMat);
				 *     mat4.scale(dest, scale)
				 *     mat4.translate(dest, negativeOrigin);
				 *
				 * @param {mat4} out mat4 receiving operation result
				 * @param {quat4} q Rotation quaternion
				 * @param {vec3} v Translation vector
				 * @param {vec3} s Scaling vector
				 * @param {vec3} o The origin vector around which to scale and rotate
				 * @returns {mat4} out
				 */
				mat4.fromRotationTranslationScaleOrigin = function (out, q, v, s, o) {
					// Quaternion math
					var x = q[0], y = q[1], z = q[2], w = q[3],
						x2 = x + x,
						y2 = y + y,
						z2 = z + z,

						xx = x * x2,
						xy = x * y2,
						xz = x * z2,
						yy = y * y2,
						yz = y * z2,
						zz = z * z2,
						wx = w * x2,
						wy = w * y2,
						wz = w * z2,

						sx = s[0],
						sy = s[1],
						sz = s[2],

						ox = o[0],
						oy = o[1],
						oz = o[2];

					out[0] = (1 - (yy + zz)) * sx;
					out[1] = (xy + wz) * sx;
					out[2] = (xz - wy) * sx;
					out[3] = 0;
					out[4] = (xy - wz) * sy;
					out[5] = (1 - (xx + zz)) * sy;
					out[6] = (yz + wx) * sy;
					out[7] = 0;
					out[8] = (xz + wy) * sz;
					out[9] = (yz - wx) * sz;
					out[10] = (1 - (xx + yy)) * sz;
					out[11] = 0;
					out[12] = v[0] + ox - (out[0] * ox + out[4] * oy + out[8] * oz);
					out[13] = v[1] + oy - (out[1] * ox + out[5] * oy + out[9] * oz);
					out[14] = v[2] + oz - (out[2] * ox + out[6] * oy + out[10] * oz);
					out[15] = 1;

					return out;
				};

				mat4.fromQuat = function (out, q) {
					var x = q[0], y = q[1], z = q[2], w = q[3],
						x2 = x + x,
						y2 = y + y,
						z2 = z + z,

						xx = x * x2,
						yx = y * x2,
						yy = y * y2,
						zx = z * x2,
						zy = z * y2,
						zz = z * z2,
						wx = w * x2,
						wy = w * y2,
						wz = w * z2;

					out[0] = 1 - yy - zz;
					out[1] = yx + wz;
					out[2] = zx - wy;
					out[3] = 0;

					out[4] = yx - wz;
					out[5] = 1 - xx - zz;
					out[6] = zy + wx;
					out[7] = 0;

					out[8] = zx + wy;
					out[9] = zy - wx;
					out[10] = 1 - xx - yy;
					out[11] = 0;

					out[12] = 0;
					out[13] = 0;
					out[14] = 0;
					out[15] = 1;

					return out;
				};

				/**
				 * Generates a frustum matrix with the given bounds
				 *
				 * @param {mat4} out mat4 frustum matrix will be written into
				 * @param {Number} left Left bound of the frustum
				 * @param {Number} right Right bound of the frustum
				 * @param {Number} bottom Bottom bound of the frustum
				 * @param {Number} top Top bound of the frustum
				 * @param {Number} near Near bound of the frustum
				 * @param {Number} far Far bound of the frustum
				 * @returns {mat4} out
				 */
				mat4.frustum = function (out, left, right, bottom, top, near, far) {
					var rl = 1 / (right - left),
						tb = 1 / (top - bottom),
						nf = 1 / (near - far);
					out[0] = (near * 2) * rl;
					out[1] = 0;
					out[2] = 0;
					out[3] = 0;
					out[4] = 0;
					out[5] = (near * 2) * tb;
					out[6] = 0;
					out[7] = 0;
					out[8] = (right + left) * rl;
					out[9] = (top + bottom) * tb;
					out[10] = (far + near) * nf;
					out[11] = -1;
					out[12] = 0;
					out[13] = 0;
					out[14] = (far * near * 2) * nf;
					out[15] = 0;
					return out;
				};

				/**
				 * Generates a perspective projection matrix with the given bounds
				 *
				 * @param {mat4} out mat4 frustum matrix will be written into
				 * @param {number} fovy Vertical field of view in radians
				 * @param {number} aspect Aspect ratio. typically viewport width/height
				 * @param {number} near Near bound of the frustum
				 * @param {number} far Far bound of the frustum
				 * @returns {mat4} out
				 */
				mat4.perspective = function (out, fovy, aspect, near, far) {
					var f = 1.0 / Math.tan(fovy / 2),
						nf = 1 / (near - far);
					out[0] = f / aspect;
					out[1] = 0;
					out[2] = 0;
					out[3] = 0;
					out[4] = 0;
					out[5] = f;
					out[6] = 0;
					out[7] = 0;
					out[8] = 0;
					out[9] = 0;
					out[10] = (far + near) * nf;
					out[11] = -1;
					out[12] = 0;
					out[13] = 0;
					out[14] = (2 * far * near) * nf;
					out[15] = 0;
					return out;
				};

				/**
				 * Generates a perspective projection matrix with the given field of view.
				 * This is primarily useful for generating projection matrices to be used
				 * with the still experiemental WebVR API.
				 *
				 * @param {mat4} out mat4 frustum matrix will be written into
				 * @param {number} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
				 * @param {number} near Near bound of the frustum
				 * @param {number} far Far bound of the frustum
				 * @returns {mat4} out
				 */
				mat4.perspectiveFromFieldOfView = function (out, fov, near, far) {
					var upTan = Math.tan(fov.upDegrees * Math.PI / 180.0),
						downTan = Math.tan(fov.downDegrees * Math.PI / 180.0),
						leftTan = Math.tan(fov.leftDegrees * Math.PI / 180.0),
						rightTan = Math.tan(fov.rightDegrees * Math.PI / 180.0),
						xScale = 2.0 / (leftTan + rightTan),
						yScale = 2.0 / (upTan + downTan);

					out[0] = xScale;
					out[1] = 0.0;
					out[2] = 0.0;
					out[3] = 0.0;
					out[4] = 0.0;
					out[5] = yScale;
					out[6] = 0.0;
					out[7] = 0.0;
					out[8] = -((leftTan - rightTan) * xScale * 0.5);
					out[9] = ((upTan - downTan) * yScale * 0.5);
					out[10] = far / (near - far);
					out[11] = -1.0;
					out[12] = 0.0;
					out[13] = 0.0;
					out[14] = (far * near) / (near - far);
					out[15] = 0.0;
					return out;
				}

				/**
				 * Generates a orthogonal projection matrix with the given bounds
				 *
				 * @param {mat4} out mat4 frustum matrix will be written into
				 * @param {number} left Left bound of the frustum
				 * @param {number} right Right bound of the frustum
				 * @param {number} bottom Bottom bound of the frustum
				 * @param {number} top Top bound of the frustum
				 * @param {number} near Near bound of the frustum
				 * @param {number} far Far bound of the frustum
				 * @returns {mat4} out
				 */
				mat4.ortho = function (out, left, right, bottom, top, near, far) {
					var lr = 1 / (left - right),
						bt = 1 / (bottom - top),
						nf = 1 / (near - far);
					out[0] = -2 * lr;
					out[1] = 0;
					out[2] = 0;
					out[3] = 0;
					out[4] = 0;
					out[5] = -2 * bt;
					out[6] = 0;
					out[7] = 0;
					out[8] = 0;
					out[9] = 0;
					out[10] = 2 * nf;
					out[11] = 0;
					out[12] = (left + right) * lr;
					out[13] = (top + bottom) * bt;
					out[14] = (far + near) * nf;
					out[15] = 1;
					return out;
				};

				/**
				 * Generates a look-at matrix with the given eye position, focal point, and up axis
				 *
				 * @param {mat4} out mat4 frustum matrix will be written into
				 * @param {vec3} eye Position of the viewer
				 * @param {vec3} center Point the viewer is looking at
				 * @param {vec3} up vec3 pointing up
				 * @returns {mat4} out
				 */
				mat4.lookAt = function (out, eye, center, up) {
					var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
						eyex = eye[0],
						eyey = eye[1],
						eyez = eye[2],
						upx = up[0],
						upy = up[1],
						upz = up[2],
						centerx = center[0],
						centery = center[1],
						centerz = center[2];

					if (Math.abs(eyex - centerx) < glMatrix.EPSILON &&
						Math.abs(eyey - centery) < glMatrix.EPSILON &&
						Math.abs(eyez - centerz) < glMatrix.EPSILON) {
						return mat4.identity(out);
					}

					z0 = eyex - centerx;
					z1 = eyey - centery;
					z2 = eyez - centerz;

					len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
					z0 *= len;
					z1 *= len;
					z2 *= len;

					x0 = upy * z2 - upz * z1;
					x1 = upz * z0 - upx * z2;
					x2 = upx * z1 - upy * z0;
					len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
					if (!len) {
						x0 = 0;
						x1 = 0;
						x2 = 0;
					} else {
						len = 1 / len;
						x0 *= len;
						x1 *= len;
						x2 *= len;
					}

					y0 = z1 * x2 - z2 * x1;
					y1 = z2 * x0 - z0 * x2;
					y2 = z0 * x1 - z1 * x0;

					len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
					if (!len) {
						y0 = 0;
						y1 = 0;
						y2 = 0;
					} else {
						len = 1 / len;
						y0 *= len;
						y1 *= len;
						y2 *= len;
					}

					out[0] = x0;
					out[1] = y0;
					out[2] = z0;
					out[3] = 0;
					out[4] = x1;
					out[5] = y1;
					out[6] = z1;
					out[7] = 0;
					out[8] = x2;
					out[9] = y2;
					out[10] = z2;
					out[11] = 0;
					out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
					out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
					out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
					out[15] = 1;

					return out;
				};

				/**
				 * Returns a string representation of a mat4
				 *
				 * @param {mat4} mat matrix to represent as a string
				 * @returns {String} string representation of the matrix
				 */
				mat4.str = function (a) {
					return 'mat4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' +
						a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' +
						a[8] + ', ' + a[9] + ', ' + a[10] + ', ' + a[11] + ', ' +
						a[12] + ', ' + a[13] + ', ' + a[14] + ', ' + a[15] + ')';
				};

				/**
				 * Returns Frobenius norm of a mat4
				 *
				 * @param {mat4} a the matrix to calculate Frobenius norm of
				 * @returns {Number} Frobenius norm
				 */
				mat4.frob = function (a) {
					return (Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2) + Math.pow(a[9], 2) + Math.pow(a[10], 2) + Math.pow(a[11], 2) + Math.pow(a[12], 2) + Math.pow(a[13], 2) + Math.pow(a[14], 2) + Math.pow(a[15], 2)))
				};


				module.exports = mat4;


				/***/
},
/* 6 */
/***/ function (module, exports, __webpack_require__) {

				/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.
			
				Permission is hereby granted, free of charge, to any person obtaining a copy
				of this software and associated documentation files (the "Software"), to deal
				in the Software without restriction, including without limitation the rights
				to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
				copies of the Software, and to permit persons to whom the Software is
				furnished to do so, subject to the following conditions:
			
				The above copyright notice and this permission notice shall be included in
				all copies or substantial portions of the Software.
			
				THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
				IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
				FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
				AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
				LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
				OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
				THE SOFTWARE. */

				var glMatrix = __webpack_require__(1);
				var mat3 = __webpack_require__(4);
				var vec3 = __webpack_require__(7);
				var vec4 = __webpack_require__(8);

				/**
				 * @class Quaternion
				 * @name quat
				 */
				var quat = {};

				/**
				 * Creates a new identity quat
				 *
				 * @returns {quat} a new quaternion
				 */
				quat.create = function () {
					var out = new glMatrix.ARRAY_TYPE(4);
					out[0] = 0;
					out[1] = 0;
					out[2] = 0;
					out[3] = 1;
					return out;
				};

				/**
				 * Sets a quaternion to represent the shortest rotation from one
				 * vector to another.
				 *
				 * Both vectors are assumed to be unit length.
				 *
				 * @param {quat} out the receiving quaternion.
				 * @param {vec3} a the initial vector
				 * @param {vec3} b the destination vector
				 * @returns {quat} out
				 */
				quat.rotationTo = (function () {
					var tmpvec3 = vec3.create();
					var xUnitVec3 = vec3.fromValues(1, 0, 0);
					var yUnitVec3 = vec3.fromValues(0, 1, 0);

					return function (out, a, b) {
						var dot = vec3.dot(a, b);
						if (dot < -0.999999) {
							vec3.cross(tmpvec3, xUnitVec3, a);
							if (vec3.length(tmpvec3) < 0.000001)
								vec3.cross(tmpvec3, yUnitVec3, a);
							vec3.normalize(tmpvec3, tmpvec3);
							quat.setAxisAngle(out, tmpvec3, Math.PI);
							return out;
						} else if (dot > 0.999999) {
							out[0] = 0;
							out[1] = 0;
							out[2] = 0;
							out[3] = 1;
							return out;
						} else {
							vec3.cross(tmpvec3, a, b);
							out[0] = tmpvec3[0];
							out[1] = tmpvec3[1];
							out[2] = tmpvec3[2];
							out[3] = 1 + dot;
							return quat.normalize(out, out);
						}
					};
				})();

				/**
				 * Sets the specified quaternion with values corresponding to the given
				 * axes. Each axis is a vec3 and is expected to be unit length and
				 * perpendicular to all other specified axes.
				 *
				 * @param {vec3} view  the vector representing the viewing direction
				 * @param {vec3} right the vector representing the local "right" direction
				 * @param {vec3} up    the vector representing the local "up" direction
				 * @returns {quat} out
				 */
				quat.setAxes = (function () {
					var matr = mat3.create();

					return function (out, view, right, up) {
						matr[0] = right[0];
						matr[3] = right[1];
						matr[6] = right[2];

						matr[1] = up[0];
						matr[4] = up[1];
						matr[7] = up[2];

						matr[2] = -view[0];
						matr[5] = -view[1];
						matr[8] = -view[2];

						return quat.normalize(out, quat.fromMat3(out, matr));
					};
				})();

				/**
				 * Creates a new quat initialized with values from an existing quaternion
				 *
				 * @param {quat} a quaternion to clone
				 * @returns {quat} a new quaternion
				 * @function
				 */
				quat.clone = vec4.clone;

				/**
				 * Creates a new quat initialized with the given values
				 *
				 * @param {Number} x X component
				 * @param {Number} y Y component
				 * @param {Number} z Z component
				 * @param {Number} w W component
				 * @returns {quat} a new quaternion
				 * @function
				 */
				quat.fromValues = vec4.fromValues;

				/**
				 * Copy the values from one quat to another
				 *
				 * @param {quat} out the receiving quaternion
				 * @param {quat} a the source quaternion
				 * @returns {quat} out
				 * @function
				 */
				quat.copy = vec4.copy;

				/**
				 * Set the components of a quat to the given values
				 *
				 * @param {quat} out the receiving quaternion
				 * @param {Number} x X component
				 * @param {Number} y Y component
				 * @param {Number} z Z component
				 * @param {Number} w W component
				 * @returns {quat} out
				 * @function
				 */
				quat.set = vec4.set;

				/**
				 * Set a quat to the identity quaternion
				 *
				 * @param {quat} out the receiving quaternion
				 * @returns {quat} out
				 */
				quat.identity = function (out) {
					out[0] = 0;
					out[1] = 0;
					out[2] = 0;
					out[3] = 1;
					return out;
				};

				/**
				 * Sets a quat from the given angle and rotation axis,
				 * then returns it.
				 *
				 * @param {quat} out the receiving quaternion
				 * @param {vec3} axis the axis around which to rotate
				 * @param {Number} rad the angle in radians
				 * @returns {quat} out
				 **/
				quat.setAxisAngle = function (out, axis, rad) {
					rad = rad * 0.5;
					var s = Math.sin(rad);
					out[0] = s * axis[0];
					out[1] = s * axis[1];
					out[2] = s * axis[2];
					out[3] = Math.cos(rad);
					return out;
				};

				/**
				 * Adds two quat's
				 *
				 * @param {quat} out the receiving quaternion
				 * @param {quat} a the first operand
				 * @param {quat} b the second operand
				 * @returns {quat} out
				 * @function
				 */
				quat.add = vec4.add;

				/**
				 * Multiplies two quat's
				 *
				 * @param {quat} out the receiving quaternion
				 * @param {quat} a the first operand
				 * @param {quat} b the second operand
				 * @returns {quat} out
				 */
				quat.multiply = function (out, a, b) {
					var ax = a[0], ay = a[1], az = a[2], aw = a[3],
						bx = b[0], by = b[1], bz = b[2], bw = b[3];

					out[0] = ax * bw + aw * bx + ay * bz - az * by;
					out[1] = ay * bw + aw * by + az * bx - ax * bz;
					out[2] = az * bw + aw * bz + ax * by - ay * bx;
					out[3] = aw * bw - ax * bx - ay * by - az * bz;
					return out;
				};

				/**
				 * Alias for {@link quat.multiply}
				 * @function
				 */
				quat.mul = quat.multiply;

				/**
				 * Scales a quat by a scalar number
				 *
				 * @param {quat} out the receiving vector
				 * @param {quat} a the vector to scale
				 * @param {Number} b amount to scale the vector by
				 * @returns {quat} out
				 * @function
				 */
				quat.scale = vec4.scale;

				/**
				 * Rotates a quaternion by the given angle about the X axis
				 *
				 * @param {quat} out quat receiving operation result
				 * @param {quat} a quat to rotate
				 * @param {number} rad angle (in radians) to rotate
				 * @returns {quat} out
				 */
				quat.rotateX = function (out, a, rad) {
					rad *= 0.5;

					var ax = a[0], ay = a[1], az = a[2], aw = a[3],
						bx = Math.sin(rad), bw = Math.cos(rad);

					out[0] = ax * bw + aw * bx;
					out[1] = ay * bw + az * bx;
					out[2] = az * bw - ay * bx;
					out[3] = aw * bw - ax * bx;
					return out;
				};

				/**
				 * Rotates a quaternion by the given angle about the Y axis
				 *
				 * @param {quat} out quat receiving operation result
				 * @param {quat} a quat to rotate
				 * @param {number} rad angle (in radians) to rotate
				 * @returns {quat} out
				 */
				quat.rotateY = function (out, a, rad) {
					rad *= 0.5;

					var ax = a[0], ay = a[1], az = a[2], aw = a[3],
						by = Math.sin(rad), bw = Math.cos(rad);

					out[0] = ax * bw - az * by;
					out[1] = ay * bw + aw * by;
					out[2] = az * bw + ax * by;
					out[3] = aw * bw - ay * by;
					return out;
				};

				/**
				 * Rotates a quaternion by the given angle about the Z axis
				 *
				 * @param {quat} out quat receiving operation result
				 * @param {quat} a quat to rotate
				 * @param {number} rad angle (in radians) to rotate
				 * @returns {quat} out
				 */
				quat.rotateZ = function (out, a, rad) {
					rad *= 0.5;

					var ax = a[0], ay = a[1], az = a[2], aw = a[3],
						bz = Math.sin(rad), bw = Math.cos(rad);

					out[0] = ax * bw + ay * bz;
					out[1] = ay * bw - ax * bz;
					out[2] = az * bw + aw * bz;
					out[3] = aw * bw - az * bz;
					return out;
				};

				/**
				 * Calculates the W component of a quat from the X, Y, and Z components.
				 * Assumes that quaternion is 1 unit in length.
				 * Any existing W component will be ignored.
				 *
				 * @param {quat} out the receiving quaternion
				 * @param {quat} a quat to calculate W component of
				 * @returns {quat} out
				 */
				quat.calculateW = function (out, a) {
					var x = a[0], y = a[1], z = a[2];

					out[0] = x;
					out[1] = y;
					out[2] = z;
					out[3] = Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
					return out;
				};

				/**
				 * Calculates the dot product of two quat's
				 *
				 * @param {quat} a the first operand
				 * @param {quat} b the second operand
				 * @returns {Number} dot product of a and b
				 * @function
				 */
				quat.dot = vec4.dot;

				/**
				 * Performs a linear interpolation between two quat's
				 *
				 * @param {quat} out the receiving quaternion
				 * @param {quat} a the first operand
				 * @param {quat} b the second operand
				 * @param {Number} t interpolation amount between the two inputs
				 * @returns {quat} out
				 * @function
				 */
				quat.lerp = vec4.lerp;

				/**
				 * Performs a spherical linear interpolation between two quat
				 *
				 * @param {quat} out the receiving quaternion
				 * @param {quat} a the first operand
				 * @param {quat} b the second operand
				 * @param {Number} t interpolation amount between the two inputs
				 * @returns {quat} out
				 */
				quat.slerp = function (out, a, b, t) {
					// benchmarks:
					//    http://jsperf.com/quaternion-slerp-implementations

					var ax = a[0], ay = a[1], az = a[2], aw = a[3],
						bx = b[0], by = b[1], bz = b[2], bw = b[3];

					var omega, cosom, sinom, scale0, scale1;

					// calc cosine
					cosom = ax * bx + ay * by + az * bz + aw * bw;
					// adjust signs (if necessary)
					if (cosom < 0.0) {
						cosom = -cosom;
						bx = - bx;
						by = - by;
						bz = - bz;
						bw = - bw;
					}
					// calculate coefficients
					if ((1.0 - cosom) > 0.000001) {
						// standard case (slerp)
						omega = Math.acos(cosom);
						sinom = Math.sin(omega);
						scale0 = Math.sin((1.0 - t) * omega) / sinom;
						scale1 = Math.sin(t * omega) / sinom;
					} else {
						// "from" and "to" quaternions are very close 
						//  ... so we can do a linear interpolation
						scale0 = 1.0 - t;
						scale1 = t;
					}
					// calculate final values
					out[0] = scale0 * ax + scale1 * bx;
					out[1] = scale0 * ay + scale1 * by;
					out[2] = scale0 * az + scale1 * bz;
					out[3] = scale0 * aw + scale1 * bw;

					return out;
				};

				/**
				 * Performs a spherical linear interpolation with two control points
				 *
				 * @param {quat} out the receiving quaternion
				 * @param {quat} a the first operand
				 * @param {quat} b the second operand
				 * @param {quat} c the third operand
				 * @param {quat} d the fourth operand
				 * @param {Number} t interpolation amount
				 * @returns {quat} out
				 */
				quat.sqlerp = (function () {
					var temp1 = quat.create();
					var temp2 = quat.create();

					return function (out, a, b, c, d, t) {
						quat.slerp(temp1, a, d, t);
						quat.slerp(temp2, b, c, t);
						quat.slerp(out, temp1, temp2, 2 * t * (1 - t));

						return out;
					};
				}());

				/**
				 * Calculates the inverse of a quat
				 *
				 * @param {quat} out the receiving quaternion
				 * @param {quat} a quat to calculate inverse of
				 * @returns {quat} out
				 */
				quat.invert = function (out, a) {
					var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
						dot = a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3,
						invDot = dot ? 1.0 / dot : 0;

					// TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

					out[0] = -a0 * invDot;
					out[1] = -a1 * invDot;
					out[2] = -a2 * invDot;
					out[3] = a3 * invDot;
					return out;
				};

				/**
				 * Calculates the conjugate of a quat
				 * If the quaternion is normalized, this function is faster than quat.inverse and produces the same result.
				 *
				 * @param {quat} out the receiving quaternion
				 * @param {quat} a quat to calculate conjugate of
				 * @returns {quat} out
				 */
				quat.conjugate = function (out, a) {
					out[0] = -a[0];
					out[1] = -a[1];
					out[2] = -a[2];
					out[3] = a[3];
					return out;
				};

				/**
				 * Calculates the length of a quat
				 *
				 * @param {quat} a vector to calculate length of
				 * @returns {Number} length of a
				 * @function
				 */
				quat.length = vec4.length;

				/**
				 * Alias for {@link quat.length}
				 * @function
				 */
				quat.len = quat.length;

				/**
				 * Calculates the squared length of a quat
				 *
				 * @param {quat} a vector to calculate squared length of
				 * @returns {Number} squared length of a
				 * @function
				 */
				quat.squaredLength = vec4.squaredLength;

				/**
				 * Alias for {@link quat.squaredLength}
				 * @function
				 */
				quat.sqrLen = quat.squaredLength;

				/**
				 * Normalize a quat
				 *
				 * @param {quat} out the receiving quaternion
				 * @param {quat} a quaternion to normalize
				 * @returns {quat} out
				 * @function
				 */
				quat.normalize = vec4.normalize;

				/**
				 * Creates a quaternion from the given 3x3 rotation matrix.
				 *
				 * NOTE: The resultant quaternion is not normalized, so you should be sure
				 * to renormalize the quaternion yourself where necessary.
				 *
				 * @param {quat} out the receiving quaternion
				 * @param {mat3} m rotation matrix
				 * @returns {quat} out
				 * @function
				 */
				quat.fromMat3 = function (out, m) {
					// Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
					// article "Quaternion Calculus and Fast Animation".
					var fTrace = m[0] + m[4] + m[8];
					var fRoot;

					if (fTrace > 0.0) {
						// |w| > 1/2, may as well choose w > 1/2
						fRoot = Math.sqrt(fTrace + 1.0);  // 2w
						out[3] = 0.5 * fRoot;
						fRoot = 0.5 / fRoot;  // 1/(4w)
						out[0] = (m[5] - m[7]) * fRoot;
						out[1] = (m[6] - m[2]) * fRoot;
						out[2] = (m[1] - m[3]) * fRoot;
					} else {
						// |w| <= 1/2
						var i = 0;
						if (m[4] > m[0])
							i = 1;
						if (m[8] > m[i * 3 + i])
							i = 2;
						var j = (i + 1) % 3;
						var k = (i + 2) % 3;

						fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1.0);
						out[i] = 0.5 * fRoot;
						fRoot = 0.5 / fRoot;
						out[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;
						out[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;
						out[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;
					}

					return out;
				};

				/**
				 * Returns a string representation of a quatenion
				 *
				 * @param {quat} vec vector to represent as a string
				 * @returns {String} string representation of the vector
				 */
				quat.str = function (a) {
					return 'quat(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
				};

				module.exports = quat;


				/***/
},
/* 7 */
/***/ function (module, exports, __webpack_require__) {

				/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.
			
				Permission is hereby granted, free of charge, to any person obtaining a copy
				of this software and associated documentation files (the "Software"), to deal
				in the Software without restriction, including without limitation the rights
				to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
				copies of the Software, and to permit persons to whom the Software is
				furnished to do so, subject to the following conditions:
			
				The above copyright notice and this permission notice shall be included in
				all copies or substantial portions of the Software.
			
				THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
				IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
				FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
				AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
				LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
				OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
				THE SOFTWARE. */

				var glMatrix = __webpack_require__(1);

				/**
				 * @class 3 Dimensional Vector
				 * @name vec3
				 */
				var vec3 = {};

				/**
				 * Creates a new, empty vec3
				 *
				 * @returns {vec3} a new 3D vector
				 */
				vec3.create = function () {
					var out = new glMatrix.ARRAY_TYPE(3);
					out[0] = 0;
					out[1] = 0;
					out[2] = 0;
					return out;
				};

				/**
				 * Creates a new vec3 initialized with values from an existing vector
				 *
				 * @param {vec3} a vector to clone
				 * @returns {vec3} a new 3D vector
				 */
				vec3.clone = function (a) {
					var out = new glMatrix.ARRAY_TYPE(3);
					out[0] = a[0];
					out[1] = a[1];
					out[2] = a[2];
					return out;
				};

				/**
				 * Creates a new vec3 initialized with the given values
				 *
				 * @param {Number} x X component
				 * @param {Number} y Y component
				 * @param {Number} z Z component
				 * @returns {vec3} a new 3D vector
				 */
				vec3.fromValues = function (x, y, z) {
					var out = new glMatrix.ARRAY_TYPE(3);
					out[0] = x;
					out[1] = y;
					out[2] = z;
					return out;
				};

				/**
				 * Copy the values from one vec3 to another
				 *
				 * @param {vec3} out the receiving vector
				 * @param {vec3} a the source vector
				 * @returns {vec3} out
				 */
				vec3.copy = function (out, a) {
					out[0] = a[0];
					out[1] = a[1];
					out[2] = a[2];
					return out;
				};

				/**
				 * Set the components of a vec3 to the given values
				 *
				 * @param {vec3} out the receiving vector
				 * @param {Number} x X component
				 * @param {Number} y Y component
				 * @param {Number} z Z component
				 * @returns {vec3} out
				 */
				vec3.set = function (out, x, y, z) {
					out[0] = x;
					out[1] = y;
					out[2] = z;
					return out;
				};

				/**
				 * Adds two vec3's
				 *
				 * @param {vec3} out the receiving vector
				 * @param {vec3} a the first operand
				 * @param {vec3} b the second operand
				 * @returns {vec3} out
				 */
				vec3.add = function (out, a, b) {
					out[0] = a[0] + b[0];
					out[1] = a[1] + b[1];
					out[2] = a[2] + b[2];
					return out;
				};

				/**
				 * Subtracts vector b from vector a
				 *
				 * @param {vec3} out the receiving vector
				 * @param {vec3} a the first operand
				 * @param {vec3} b the second operand
				 * @returns {vec3} out
				 */
				vec3.subtract = function (out, a, b) {
					out[0] = a[0] - b[0];
					out[1] = a[1] - b[1];
					out[2] = a[2] - b[2];
					return out;
				};

				/**
				 * Alias for {@link vec3.subtract}
				 * @function
				 */
				vec3.sub = vec3.subtract;

				/**
				 * Multiplies two vec3's
				 *
				 * @param {vec3} out the receiving vector
				 * @param {vec3} a the first operand
				 * @param {vec3} b the second operand
				 * @returns {vec3} out
				 */
				vec3.multiply = function (out, a, b) {
					out[0] = a[0] * b[0];
					out[1] = a[1] * b[1];
					out[2] = a[2] * b[2];
					return out;
				};

				/**
				 * Alias for {@link vec3.multiply}
				 * @function
				 */
				vec3.mul = vec3.multiply;

				/**
				 * Divides two vec3's
				 *
				 * @param {vec3} out the receiving vector
				 * @param {vec3} a the first operand
				 * @param {vec3} b the second operand
				 * @returns {vec3} out
				 */
				vec3.divide = function (out, a, b) {
					out[0] = a[0] / b[0];
					out[1] = a[1] / b[1];
					out[2] = a[2] / b[2];
					return out;
				};

				/**
				 * Alias for {@link vec3.divide}
				 * @function
				 */
				vec3.div = vec3.divide;

				/**
				 * Returns the minimum of two vec3's
				 *
				 * @param {vec3} out the receiving vector
				 * @param {vec3} a the first operand
				 * @param {vec3} b the second operand
				 * @returns {vec3} out
				 */
				vec3.min = function (out, a, b) {
					out[0] = Math.min(a[0], b[0]);
					out[1] = Math.min(a[1], b[1]);
					out[2] = Math.min(a[2], b[2]);
					return out;
				};

				/**
				 * Returns the maximum of two vec3's
				 *
				 * @param {vec3} out the receiving vector
				 * @param {vec3} a the first operand
				 * @param {vec3} b the second operand
				 * @returns {vec3} out
				 */
				vec3.max = function (out, a, b) {
					out[0] = Math.max(a[0], b[0]);
					out[1] = Math.max(a[1], b[1]);
					out[2] = Math.max(a[2], b[2]);
					return out;
				};

				/**
				 * Scales a vec3 by a scalar number
				 *
				 * @param {vec3} out the receiving vector
				 * @param {vec3} a the vector to scale
				 * @param {Number} b amount to scale the vector by
				 * @returns {vec3} out
				 */
				vec3.scale = function (out, a, b) {
					out[0] = a[0] * b;
					out[1] = a[1] * b;
					out[2] = a[2] * b;
					return out;
				};

				/**
				 * Adds two vec3's after scaling the second operand by a scalar value
				 *
				 * @param {vec3} out the receiving vector
				 * @param {vec3} a the first operand
				 * @param {vec3} b the second operand
				 * @param {Number} scale the amount to scale b by before adding
				 * @returns {vec3} out
				 */
				vec3.scaleAndAdd = function (out, a, b, scale) {
					out[0] = a[0] + (b[0] * scale);
					out[1] = a[1] + (b[1] * scale);
					out[2] = a[2] + (b[2] * scale);
					return out;
				};

				/**
				 * Calculates the euclidian distance between two vec3's
				 *
				 * @param {vec3} a the first operand
				 * @param {vec3} b the second operand
				 * @returns {Number} distance between a and b
				 */
				vec3.distance = function (a, b) {
					var x = b[0] - a[0],
						y = b[1] - a[1],
						z = b[2] - a[2];
					return Math.sqrt(x * x + y * y + z * z);
				};

				/**
				 * Alias for {@link vec3.distance}
				 * @function
				 */
				vec3.dist = vec3.distance;

				/**
				 * Calculates the squared euclidian distance between two vec3's
				 *
				 * @param {vec3} a the first operand
				 * @param {vec3} b the second operand
				 * @returns {Number} squared distance between a and b
				 */
				vec3.squaredDistance = function (a, b) {
					var x = b[0] - a[0],
						y = b[1] - a[1],
						z = b[2] - a[2];
					return x * x + y * y + z * z;
				};

				/**
				 * Alias for {@link vec3.squaredDistance}
				 * @function
				 */
				vec3.sqrDist = vec3.squaredDistance;

				/**
				 * Calculates the length of a vec3
				 *
				 * @param {vec3} a vector to calculate length of
				 * @returns {Number} length of a
				 */
				vec3.length = function (a) {
					var x = a[0],
						y = a[1],
						z = a[2];
					return Math.sqrt(x * x + y * y + z * z);
				};

				/**
				 * Alias for {@link vec3.length}
				 * @function
				 */
				vec3.len = vec3.length;

				/**
				 * Calculates the squared length of a vec3
				 *
				 * @param {vec3} a vector to calculate squared length of
				 * @returns {Number} squared length of a
				 */
				vec3.squaredLength = function (a) {
					var x = a[0],
						y = a[1],
						z = a[2];
					return x * x + y * y + z * z;
				};

				/**
				 * Alias for {@link vec3.squaredLength}
				 * @function
				 */
				vec3.sqrLen = vec3.squaredLength;

				/**
				 * Negates the components of a vec3
				 *
				 * @param {vec3} out the receiving vector
				 * @param {vec3} a vector to negate
				 * @returns {vec3} out
				 */
				vec3.negate = function (out, a) {
					out[0] = -a[0];
					out[1] = -a[1];
					out[2] = -a[2];
					return out;
				};

				/**
				 * Returns the inverse of the components of a vec3
				 *
				 * @param {vec3} out the receiving vector
				 * @param {vec3} a vector to invert
				 * @returns {vec3} out
				 */
				vec3.inverse = function (out, a) {
					out[0] = 1.0 / a[0];
					out[1] = 1.0 / a[1];
					out[2] = 1.0 / a[2];
					return out;
				};

				/**
				 * Normalize a vec3
				 *
				 * @param {vec3} out the receiving vector
				 * @param {vec3} a vector to normalize
				 * @returns {vec3} out
				 */
				vec3.normalize = function (out, a) {
					var x = a[0],
						y = a[1],
						z = a[2];
					var len = x * x + y * y + z * z;
					if (len > 0) {
						//TODO: evaluate use of glm_invsqrt here?
						len = 1 / Math.sqrt(len);
						out[0] = a[0] * len;
						out[1] = a[1] * len;
						out[2] = a[2] * len;
					}
					return out;
				};

				/**
				 * Calculates the dot product of two vec3's
				 *
				 * @param {vec3} a the first operand
				 * @param {vec3} b the second operand
				 * @returns {Number} dot product of a and b
				 */
				vec3.dot = function (a, b) {
					return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
				};

				/**
				 * Computes the cross product of two vec3's
				 *
				 * @param {vec3} out the receiving vector
				 * @param {vec3} a the first operand
				 * @param {vec3} b the second operand
				 * @returns {vec3} out
				 */
				vec3.cross = function (out, a, b) {
					var ax = a[0], ay = a[1], az = a[2],
						bx = b[0], by = b[1], bz = b[2];

					out[0] = ay * bz - az * by;
					out[1] = az * bx - ax * bz;
					out[2] = ax * by - ay * bx;
					return out;
				};

				/**
				 * Performs a linear interpolation between two vec3's
				 *
				 * @param {vec3} out the receiving vector
				 * @param {vec3} a the first operand
				 * @param {vec3} b the second operand
				 * @param {Number} t interpolation amount between the two inputs
				 * @returns {vec3} out
				 */
				vec3.lerp = function (out, a, b, t) {
					var ax = a[0],
						ay = a[1],
						az = a[2];
					out[0] = ax + t * (b[0] - ax);
					out[1] = ay + t * (b[1] - ay);
					out[2] = az + t * (b[2] - az);
					return out;
				};

				/**
				 * Performs a hermite interpolation with two control points
				 *
				 * @param {vec3} out the receiving vector
				 * @param {vec3} a the first operand
				 * @param {vec3} b the second operand
				 * @param {vec3} c the third operand
				 * @param {vec3} d the fourth operand
				 * @param {Number} t interpolation amount between the two inputs
				 * @returns {vec3} out
				 */
				vec3.hermite = function (out, a, b, c, d, t) {
					var factorTimes2 = t * t,
						factor1 = factorTimes2 * (2 * t - 3) + 1,
						factor2 = factorTimes2 * (t - 2) + t,
						factor3 = factorTimes2 * (t - 1),
						factor4 = factorTimes2 * (3 - 2 * t);

					out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
					out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
					out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;

					return out;
				};

				/**
				 * Performs a bezier interpolation with two control points
				 *
				 * @param {vec3} out the receiving vector
				 * @param {vec3} a the first operand
				 * @param {vec3} b the second operand
				 * @param {vec3} c the third operand
				 * @param {vec3} d the fourth operand
				 * @param {Number} t interpolation amount between the two inputs
				 * @returns {vec3} out
				 */
				vec3.bezier = function (out, a, b, c, d, t) {
					var inverseFactor = 1 - t,
						inverseFactorTimesTwo = inverseFactor * inverseFactor,
						factorTimes2 = t * t,
						factor1 = inverseFactorTimesTwo * inverseFactor,
						factor2 = 3 * t * inverseFactorTimesTwo,
						factor3 = 3 * factorTimes2 * inverseFactor,
						factor4 = factorTimes2 * t;

					out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
					out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
					out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;

					return out;
				};

				/**
				 * Generates a random vector with the given scale
				 *
				 * @param {vec3} out the receiving vector
				 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
				 * @returns {vec3} out
				 */
				vec3.random = function (out, scale) {
					scale = scale || 1.0;

					var r = glMatrix.RANDOM() * 2.0 * Math.PI;
					var z = (glMatrix.RANDOM() * 2.0) - 1.0;
					var zScale = Math.sqrt(1.0 - z * z) * scale;

					out[0] = Math.cos(r) * zScale;
					out[1] = Math.sin(r) * zScale;
					out[2] = z * scale;
					return out;
				};

				/**
				 * Transforms the vec3 with a mat4.
				 * 4th vector component is implicitly '1'
				 *
				 * @param {vec3} out the receiving vector
				 * @param {vec3} a the vector to transform
				 * @param {mat4} m matrix to transform with
				 * @returns {vec3} out
				 */
				vec3.transformMat4 = function (out, a, m) {
					var x = a[0], y = a[1], z = a[2],
						w = m[3] * x + m[7] * y + m[11] * z + m[15];
					w = w || 1.0;
					out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
					out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
					out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
					return out;
				};

				/**
				 * Transforms the vec3 with a mat3.
				 *
				 * @param {vec3} out the receiving vector
				 * @param {vec3} a the vector to transform
				 * @param {mat4} m the 3x3 matrix to transform with
				 * @returns {vec3} out
				 */
				vec3.transformMat3 = function (out, a, m) {
					var x = a[0], y = a[1], z = a[2];
					out[0] = x * m[0] + y * m[3] + z * m[6];
					out[1] = x * m[1] + y * m[4] + z * m[7];
					out[2] = x * m[2] + y * m[5] + z * m[8];
					return out;
				};

				/**
				 * Transforms the vec3 with a quat
				 *
				 * @param {vec3} out the receiving vector
				 * @param {vec3} a the vector to transform
				 * @param {quat} q quaternion to transform with
				 * @returns {vec3} out
				 */
				vec3.transformQuat = function (out, a, q) {
					// benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations

					var x = a[0], y = a[1], z = a[2],
						qx = q[0], qy = q[1], qz = q[2], qw = q[3],

						// calculate quat * vec
						ix = qw * x + qy * z - qz * y,
						iy = qw * y + qz * x - qx * z,
						iz = qw * z + qx * y - qy * x,
						iw = -qx * x - qy * y - qz * z;

					// calculate result * inverse quat
					out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
					out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
					out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
					return out;
				};

				/**
				 * Rotate a 3D vector around the x-axis
				 * @param {vec3} out The receiving vec3
				 * @param {vec3} a The vec3 point to rotate
				 * @param {vec3} b The origin of the rotation
				 * @param {Number} c The angle of rotation
				 * @returns {vec3} out
				 */
				vec3.rotateX = function (out, a, b, c) {
					var p = [], r = [];
					//Translate point to the origin
					p[0] = a[0] - b[0];
					p[1] = a[1] - b[1];
					p[2] = a[2] - b[2];

					//perform rotation
					r[0] = p[0];
					r[1] = p[1] * Math.cos(c) - p[2] * Math.sin(c);
					r[2] = p[1] * Math.sin(c) + p[2] * Math.cos(c);

					//translate to correct position
					out[0] = r[0] + b[0];
					out[1] = r[1] + b[1];
					out[2] = r[2] + b[2];

					return out;
				};

				/**
				 * Rotate a 3D vector around the y-axis
				 * @param {vec3} out The receiving vec3
				 * @param {vec3} a The vec3 point to rotate
				 * @param {vec3} b The origin of the rotation
				 * @param {Number} c The angle of rotation
				 * @returns {vec3} out
				 */
				vec3.rotateY = function (out, a, b, c) {
					var p = [], r = [];
					//Translate point to the origin
					p[0] = a[0] - b[0];
					p[1] = a[1] - b[1];
					p[2] = a[2] - b[2];

					//perform rotation
					r[0] = p[2] * Math.sin(c) + p[0] * Math.cos(c);
					r[1] = p[1];
					r[2] = p[2] * Math.cos(c) - p[0] * Math.sin(c);

					//translate to correct position
					out[0] = r[0] + b[0];
					out[1] = r[1] + b[1];
					out[2] = r[2] + b[2];

					return out;
				};

				/**
				 * Rotate a 3D vector around the z-axis
				 * @param {vec3} out The receiving vec3
				 * @param {vec3} a The vec3 point to rotate
				 * @param {vec3} b The origin of the rotation
				 * @param {Number} c The angle of rotation
				 * @returns {vec3} out
				 */
				vec3.rotateZ = function (out, a, b, c) {
					var p = [], r = [];
					//Translate point to the origin
					p[0] = a[0] - b[0];
					p[1] = a[1] - b[1];
					p[2] = a[2] - b[2];

					//perform rotation
					r[0] = p[0] * Math.cos(c) - p[1] * Math.sin(c);
					r[1] = p[0] * Math.sin(c) + p[1] * Math.cos(c);
					r[2] = p[2];

					//translate to correct position
					out[0] = r[0] + b[0];
					out[1] = r[1] + b[1];
					out[2] = r[2] + b[2];

					return out;
				};

				/**
				 * Perform some operation over an array of vec3s.
				 *
				 * @param {Array} a the array of vectors to iterate over
				 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
				 * @param {Number} offset Number of elements to skip at the beginning of the array
				 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
				 * @param {Function} fn Function to call for each vector in the array
				 * @param {Object} [arg] additional argument to pass to fn
				 * @returns {Array} a
				 * @function
				 */
				vec3.forEach = (function () {
					var vec = vec3.create();

					return function (a, stride, offset, count, fn, arg) {
						var i, l;
						if (!stride) {
							stride = 3;
						}

						if (!offset) {
							offset = 0;
						}

						if (count) {
							l = Math.min((count * stride) + offset, a.length);
						} else {
							l = a.length;
						}

						for (i = offset; i < l; i += stride) {
							vec[0] = a[i]; vec[1] = a[i + 1]; vec[2] = a[i + 2];
							fn(vec, vec, arg);
							a[i] = vec[0]; a[i + 1] = vec[1]; a[i + 2] = vec[2];
						}

						return a;
					};
				})();

				/**
				 * Get the angle between two 3D vectors
				 * @param {vec3} a The first operand
				 * @param {vec3} b The second operand
				 * @returns {Number} The angle in radians
				 */
				vec3.angle = function (a, b) {

					var tempA = vec3.fromValues(a[0], a[1], a[2]);
					var tempB = vec3.fromValues(b[0], b[1], b[2]);

					vec3.normalize(tempA, tempA);
					vec3.normalize(tempB, tempB);

					var cosine = vec3.dot(tempA, tempB);

					if (cosine > 1.0) {
						return 0;
					} else {
						return Math.acos(cosine);
					}
				};

				/**
				 * Returns a string representation of a vector
				 *
				 * @param {vec3} vec vector to represent as a string
				 * @returns {String} string representation of the vector
				 */
				vec3.str = function (a) {
					return 'vec3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ')';
				};

				module.exports = vec3;


				/***/
},
/* 8 */
/***/ function (module, exports, __webpack_require__) {

				/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.
			
				Permission is hereby granted, free of charge, to any person obtaining a copy
				of this software and associated documentation files (the "Software"), to deal
				in the Software without restriction, including without limitation the rights
				to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
				copies of the Software, and to permit persons to whom the Software is
				furnished to do so, subject to the following conditions:
			
				The above copyright notice and this permission notice shall be included in
				all copies or substantial portions of the Software.
			
				THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
				IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
				FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
				AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
				LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
				OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
				THE SOFTWARE. */

				var glMatrix = __webpack_require__(1);

				/**
				 * @class 4 Dimensional Vector
				 * @name vec4
				 */
				var vec4 = {};

				/**
				 * Creates a new, empty vec4
				 *
				 * @returns {vec4} a new 4D vector
				 */
				vec4.create = function () {
					var out = new glMatrix.ARRAY_TYPE(4);
					out[0] = 0;
					out[1] = 0;
					out[2] = 0;
					out[3] = 0;
					return out;
				};

				/**
				 * Creates a new vec4 initialized with values from an existing vector
				 *
				 * @param {vec4} a vector to clone
				 * @returns {vec4} a new 4D vector
				 */
				vec4.clone = function (a) {
					var out = new glMatrix.ARRAY_TYPE(4);
					out[0] = a[0];
					out[1] = a[1];
					out[2] = a[2];
					out[3] = a[3];
					return out;
				};

				/**
				 * Creates a new vec4 initialized with the given values
				 *
				 * @param {Number} x X component
				 * @param {Number} y Y component
				 * @param {Number} z Z component
				 * @param {Number} w W component
				 * @returns {vec4} a new 4D vector
				 */
				vec4.fromValues = function (x, y, z, w) {
					var out = new glMatrix.ARRAY_TYPE(4);
					out[0] = x;
					out[1] = y;
					out[2] = z;
					out[3] = w;
					return out;
				};

				/**
				 * Copy the values from one vec4 to another
				 *
				 * @param {vec4} out the receiving vector
				 * @param {vec4} a the source vector
				 * @returns {vec4} out
				 */
				vec4.copy = function (out, a) {
					out[0] = a[0];
					out[1] = a[1];
					out[2] = a[2];
					out[3] = a[3];
					return out;
				};

				/**
				 * Set the components of a vec4 to the given values
				 *
				 * @param {vec4} out the receiving vector
				 * @param {Number} x X component
				 * @param {Number} y Y component
				 * @param {Number} z Z component
				 * @param {Number} w W component
				 * @returns {vec4} out
				 */
				vec4.set = function (out, x, y, z, w) {
					out[0] = x;
					out[1] = y;
					out[2] = z;
					out[3] = w;
					return out;
				};

				/**
				 * Adds two vec4's
				 *
				 * @param {vec4} out the receiving vector
				 * @param {vec4} a the first operand
				 * @param {vec4} b the second operand
				 * @returns {vec4} out
				 */
				vec4.add = function (out, a, b) {
					out[0] = a[0] + b[0];
					out[1] = a[1] + b[1];
					out[2] = a[2] + b[2];
					out[3] = a[3] + b[3];
					return out;
				};

				/**
				 * Subtracts vector b from vector a
				 *
				 * @param {vec4} out the receiving vector
				 * @param {vec4} a the first operand
				 * @param {vec4} b the second operand
				 * @returns {vec4} out
				 */
				vec4.subtract = function (out, a, b) {
					out[0] = a[0] - b[0];
					out[1] = a[1] - b[1];
					out[2] = a[2] - b[2];
					out[3] = a[3] - b[3];
					return out;
				};

				/**
				 * Alias for {@link vec4.subtract}
				 * @function
				 */
				vec4.sub = vec4.subtract;

				/**
				 * Multiplies two vec4's
				 *
				 * @param {vec4} out the receiving vector
				 * @param {vec4} a the first operand
				 * @param {vec4} b the second operand
				 * @returns {vec4} out
				 */
				vec4.multiply = function (out, a, b) {
					out[0] = a[0] * b[0];
					out[1] = a[1] * b[1];
					out[2] = a[2] * b[2];
					out[3] = a[3] * b[3];
					return out;
				};

				/**
				 * Alias for {@link vec4.multiply}
				 * @function
				 */
				vec4.mul = vec4.multiply;

				/**
				 * Divides two vec4's
				 *
				 * @param {vec4} out the receiving vector
				 * @param {vec4} a the first operand
				 * @param {vec4} b the second operand
				 * @returns {vec4} out
				 */
				vec4.divide = function (out, a, b) {
					out[0] = a[0] / b[0];
					out[1] = a[1] / b[1];
					out[2] = a[2] / b[2];
					out[3] = a[3] / b[3];
					return out;
				};

				/**
				 * Alias for {@link vec4.divide}
				 * @function
				 */
				vec4.div = vec4.divide;

				/**
				 * Returns the minimum of two vec4's
				 *
				 * @param {vec4} out the receiving vector
				 * @param {vec4} a the first operand
				 * @param {vec4} b the second operand
				 * @returns {vec4} out
				 */
				vec4.min = function (out, a, b) {
					out[0] = Math.min(a[0], b[0]);
					out[1] = Math.min(a[1], b[1]);
					out[2] = Math.min(a[2], b[2]);
					out[3] = Math.min(a[3], b[3]);
					return out;
				};

				/**
				 * Returns the maximum of two vec4's
				 *
				 * @param {vec4} out the receiving vector
				 * @param {vec4} a the first operand
				 * @param {vec4} b the second operand
				 * @returns {vec4} out
				 */
				vec4.max = function (out, a, b) {
					out[0] = Math.max(a[0], b[0]);
					out[1] = Math.max(a[1], b[1]);
					out[2] = Math.max(a[2], b[2]);
					out[3] = Math.max(a[3], b[3]);
					return out;
				};

				/**
				 * Scales a vec4 by a scalar number
				 *
				 * @param {vec4} out the receiving vector
				 * @param {vec4} a the vector to scale
				 * @param {Number} b amount to scale the vector by
				 * @returns {vec4} out
				 */
				vec4.scale = function (out, a, b) {
					out[0] = a[0] * b;
					out[1] = a[1] * b;
					out[2] = a[2] * b;
					out[3] = a[3] * b;
					return out;
				};

				/**
				 * Adds two vec4's after scaling the second operand by a scalar value
				 *
				 * @param {vec4} out the receiving vector
				 * @param {vec4} a the first operand
				 * @param {vec4} b the second operand
				 * @param {Number} scale the amount to scale b by before adding
				 * @returns {vec4} out
				 */
				vec4.scaleAndAdd = function (out, a, b, scale) {
					out[0] = a[0] + (b[0] * scale);
					out[1] = a[1] + (b[1] * scale);
					out[2] = a[2] + (b[2] * scale);
					out[3] = a[3] + (b[3] * scale);
					return out;
				};

				/**
				 * Calculates the euclidian distance between two vec4's
				 *
				 * @param {vec4} a the first operand
				 * @param {vec4} b the second operand
				 * @returns {Number} distance between a and b
				 */
				vec4.distance = function (a, b) {
					var x = b[0] - a[0],
						y = b[1] - a[1],
						z = b[2] - a[2],
						w = b[3] - a[3];
					return Math.sqrt(x * x + y * y + z * z + w * w);
				};

				/**
				 * Alias for {@link vec4.distance}
				 * @function
				 */
				vec4.dist = vec4.distance;

				/**
				 * Calculates the squared euclidian distance between two vec4's
				 *
				 * @param {vec4} a the first operand
				 * @param {vec4} b the second operand
				 * @returns {Number} squared distance between a and b
				 */
				vec4.squaredDistance = function (a, b) {
					var x = b[0] - a[0],
						y = b[1] - a[1],
						z = b[2] - a[2],
						w = b[3] - a[3];
					return x * x + y * y + z * z + w * w;
				};

				/**
				 * Alias for {@link vec4.squaredDistance}
				 * @function
				 */
				vec4.sqrDist = vec4.squaredDistance;

				/**
				 * Calculates the length of a vec4
				 *
				 * @param {vec4} a vector to calculate length of
				 * @returns {Number} length of a
				 */
				vec4.length = function (a) {
					var x = a[0],
						y = a[1],
						z = a[2],
						w = a[3];
					return Math.sqrt(x * x + y * y + z * z + w * w);
				};

				/**
				 * Alias for {@link vec4.length}
				 * @function
				 */
				vec4.len = vec4.length;

				/**
				 * Calculates the squared length of a vec4
				 *
				 * @param {vec4} a vector to calculate squared length of
				 * @returns {Number} squared length of a
				 */
				vec4.squaredLength = function (a) {
					var x = a[0],
						y = a[1],
						z = a[2],
						w = a[3];
					return x * x + y * y + z * z + w * w;
				};

				/**
				 * Alias for {@link vec4.squaredLength}
				 * @function
				 */
				vec4.sqrLen = vec4.squaredLength;

				/**
				 * Negates the components of a vec4
				 *
				 * @param {vec4} out the receiving vector
				 * @param {vec4} a vector to negate
				 * @returns {vec4} out
				 */
				vec4.negate = function (out, a) {
					out[0] = -a[0];
					out[1] = -a[1];
					out[2] = -a[2];
					out[3] = -a[3];
					return out;
				};

				/**
				 * Returns the inverse of the components of a vec4
				 *
				 * @param {vec4} out the receiving vector
				 * @param {vec4} a vector to invert
				 * @returns {vec4} out
				 */
				vec4.inverse = function (out, a) {
					out[0] = 1.0 / a[0];
					out[1] = 1.0 / a[1];
					out[2] = 1.0 / a[2];
					out[3] = 1.0 / a[3];
					return out;
				};

				/**
				 * Normalize a vec4
				 *
				 * @param {vec4} out the receiving vector
				 * @param {vec4} a vector to normalize
				 * @returns {vec4} out
				 */
				vec4.normalize = function (out, a) {
					var x = a[0],
						y = a[1],
						z = a[2],
						w = a[3];
					var len = x * x + y * y + z * z + w * w;
					if (len > 0) {
						len = 1 / Math.sqrt(len);
						out[0] = x * len;
						out[1] = y * len;
						out[2] = z * len;
						out[3] = w * len;
					}
					return out;
				};

				/**
				 * Calculates the dot product of two vec4's
				 *
				 * @param {vec4} a the first operand
				 * @param {vec4} b the second operand
				 * @returns {Number} dot product of a and b
				 */
				vec4.dot = function (a, b) {
					return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
				};

				/**
				 * Performs a linear interpolation between two vec4's
				 *
				 * @param {vec4} out the receiving vector
				 * @param {vec4} a the first operand
				 * @param {vec4} b the second operand
				 * @param {Number} t interpolation amount between the two inputs
				 * @returns {vec4} out
				 */
				vec4.lerp = function (out, a, b, t) {
					var ax = a[0],
						ay = a[1],
						az = a[2],
						aw = a[3];
					out[0] = ax + t * (b[0] - ax);
					out[1] = ay + t * (b[1] - ay);
					out[2] = az + t * (b[2] - az);
					out[3] = aw + t * (b[3] - aw);
					return out;
				};

				/**
				 * Generates a random vector with the given scale
				 *
				 * @param {vec4} out the receiving vector
				 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
				 * @returns {vec4} out
				 */
				vec4.random = function (out, scale) {
					scale = scale || 1.0;

					//TODO: This is a pretty awful way of doing this. Find something better.
					out[0] = glMatrix.RANDOM();
					out[1] = glMatrix.RANDOM();
					out[2] = glMatrix.RANDOM();
					out[3] = glMatrix.RANDOM();
					vec4.normalize(out, out);
					vec4.scale(out, out, scale);
					return out;
				};

				/**
				 * Transforms the vec4 with a mat4.
				 *
				 * @param {vec4} out the receiving vector
				 * @param {vec4} a the vector to transform
				 * @param {mat4} m matrix to transform with
				 * @returns {vec4} out
				 */
				vec4.transformMat4 = function (out, a, m) {
					var x = a[0], y = a[1], z = a[2], w = a[3];
					out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
					out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
					out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
					out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
					return out;
				};

				/**
				 * Transforms the vec4 with a quat
				 *
				 * @param {vec4} out the receiving vector
				 * @param {vec4} a the vector to transform
				 * @param {quat} q quaternion to transform with
				 * @returns {vec4} out
				 */
				vec4.transformQuat = function (out, a, q) {
					var x = a[0], y = a[1], z = a[2],
						qx = q[0], qy = q[1], qz = q[2], qw = q[3],

						// calculate quat * vec
						ix = qw * x + qy * z - qz * y,
						iy = qw * y + qz * x - qx * z,
						iz = qw * z + qx * y - qy * x,
						iw = -qx * x - qy * y - qz * z;

					// calculate result * inverse quat
					out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
					out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
					out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
					out[3] = a[3];
					return out;
				};

				/**
				 * Perform some operation over an array of vec4s.
				 *
				 * @param {Array} a the array of vectors to iterate over
				 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
				 * @param {Number} offset Number of elements to skip at the beginning of the array
				 * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
				 * @param {Function} fn Function to call for each vector in the array
				 * @param {Object} [arg] additional argument to pass to fn
				 * @returns {Array} a
				 * @function
				 */
				vec4.forEach = (function () {
					var vec = vec4.create();

					return function (a, stride, offset, count, fn, arg) {
						var i, l;
						if (!stride) {
							stride = 4;
						}

						if (!offset) {
							offset = 0;
						}

						if (count) {
							l = Math.min((count * stride) + offset, a.length);
						} else {
							l = a.length;
						}

						for (i = offset; i < l; i += stride) {
							vec[0] = a[i]; vec[1] = a[i + 1]; vec[2] = a[i + 2]; vec[3] = a[i + 3];
							fn(vec, vec, arg);
							a[i] = vec[0]; a[i + 1] = vec[1]; a[i + 2] = vec[2]; a[i + 3] = vec[3];
						}

						return a;
					};
				})();

				/**
				 * Returns a string representation of a vector
				 *
				 * @param {vec4} vec vector to represent as a string
				 * @returns {String} string representation of the vector
				 */
				vec4.str = function (a) {
					return 'vec4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
				};

				module.exports = vec4;


				/***/
},
/* 9 */
/***/ function (module, exports, __webpack_require__) {

				/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.
			
				Permission is hereby granted, free of charge, to any person obtaining a copy
				of this software and associated documentation files (the "Software"), to deal
				in the Software without restriction, including without limitation the rights
				to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
				copies of the Software, and to permit persons to whom the Software is
				furnished to do so, subject to the following conditions:
			
				The above copyright notice and this permission notice shall be included in
				all copies or substantial portions of the Software.
			
				THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
				IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
				FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
				AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
				LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
				OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
				THE SOFTWARE. */

				var glMatrix = __webpack_require__(1);

				/**
				 * @class 2 Dimensional Vector
				 * @name vec2
				 */
				var vec2 = {};

				/**
				 * Creates a new, empty vec2
				 *
				 * @returns {vec2} a new 2D vector
				 */
				vec2.create = function () {
					var out = new glMatrix.ARRAY_TYPE(2);
					out[0] = 0;
					out[1] = 0;
					return out;
				};

				/**
				 * Creates a new vec2 initialized with values from an existing vector
				 *
				 * @param {vec2} a vector to clone
				 * @returns {vec2} a new 2D vector
				 */
				vec2.clone = function (a) {
					var out = new glMatrix.ARRAY_TYPE(2);
					out[0] = a[0];
					out[1] = a[1];
					return out;
				};

				/**
				 * Creates a new vec2 initialized with the given values
				 *
				 * @param {Number} x X component
				 * @param {Number} y Y component
				 * @returns {vec2} a new 2D vector
				 */
				vec2.fromValues = function (x, y) {
					var out = new glMatrix.ARRAY_TYPE(2);
					out[0] = x;
					out[1] = y;
					return out;
				};

				/**
				 * Copy the values from one vec2 to another
				 *
				 * @param {vec2} out the receiving vector
				 * @param {vec2} a the source vector
				 * @returns {vec2} out
				 */
				vec2.copy = function (out, a) {
					out[0] = a[0];
					out[1] = a[1];
					return out;
				};

				/**
				 * Set the components of a vec2 to the given values
				 *
				 * @param {vec2} out the receiving vector
				 * @param {Number} x X component
				 * @param {Number} y Y component
				 * @returns {vec2} out
				 */
				vec2.set = function (out, x, y) {
					out[0] = x;
					out[1] = y;
					return out;
				};

				/**
				 * Adds two vec2's
				 *
				 * @param {vec2} out the receiving vector
				 * @param {vec2} a the first operand
				 * @param {vec2} b the second operand
				 * @returns {vec2} out
				 */
				vec2.add = function (out, a, b) {
					out[0] = a[0] + b[0];
					out[1] = a[1] + b[1];
					return out;
				};

				/**
				 * Subtracts vector b from vector a
				 *
				 * @param {vec2} out the receiving vector
				 * @param {vec2} a the first operand
				 * @param {vec2} b the second operand
				 * @returns {vec2} out
				 */
				vec2.subtract = function (out, a, b) {
					out[0] = a[0] - b[0];
					out[1] = a[1] - b[1];
					return out;
				};

				/**
				 * Alias for {@link vec2.subtract}
				 * @function
				 */
				vec2.sub = vec2.subtract;

				/**
				 * Multiplies two vec2's
				 *
				 * @param {vec2} out the receiving vector
				 * @param {vec2} a the first operand
				 * @param {vec2} b the second operand
				 * @returns {vec2} out
				 */
				vec2.multiply = function (out, a, b) {
					out[0] = a[0] * b[0];
					out[1] = a[1] * b[1];
					return out;
				};

				/**
				 * Alias for {@link vec2.multiply}
				 * @function
				 */
				vec2.mul = vec2.multiply;

				/**
				 * Divides two vec2's
				 *
				 * @param {vec2} out the receiving vector
				 * @param {vec2} a the first operand
				 * @param {vec2} b the second operand
				 * @returns {vec2} out
				 */
				vec2.divide = function (out, a, b) {
					out[0] = a[0] / b[0];
					out[1] = a[1] / b[1];
					return out;
				};

				/**
				 * Alias for {@link vec2.divide}
				 * @function
				 */
				vec2.div = vec2.divide;

				/**
				 * Returns the minimum of two vec2's
				 *
				 * @param {vec2} out the receiving vector
				 * @param {vec2} a the first operand
				 * @param {vec2} b the second operand
				 * @returns {vec2} out
				 */
				vec2.min = function (out, a, b) {
					out[0] = Math.min(a[0], b[0]);
					out[1] = Math.min(a[1], b[1]);
					return out;
				};

				/**
				 * Returns the maximum of two vec2's
				 *
				 * @param {vec2} out the receiving vector
				 * @param {vec2} a the first operand
				 * @param {vec2} b the second operand
				 * @returns {vec2} out
				 */
				vec2.max = function (out, a, b) {
					out[0] = Math.max(a[0], b[0]);
					out[1] = Math.max(a[1], b[1]);
					return out;
				};

				/**
				 * Scales a vec2 by a scalar number
				 *
				 * @param {vec2} out the receiving vector
				 * @param {vec2} a the vector to scale
				 * @param {Number} b amount to scale the vector by
				 * @returns {vec2} out
				 */
				vec2.scale = function (out, a, b) {
					out[0] = a[0] * b;
					out[1] = a[1] * b;
					return out;
				};

				/**
				 * Adds two vec2's after scaling the second operand by a scalar value
				 *
				 * @param {vec2} out the receiving vector
				 * @param {vec2} a the first operand
				 * @param {vec2} b the second operand
				 * @param {Number} scale the amount to scale b by before adding
				 * @returns {vec2} out
				 */
				vec2.scaleAndAdd = function (out, a, b, scale) {
					out[0] = a[0] + (b[0] * scale);
					out[1] = a[1] + (b[1] * scale);
					return out;
				};

				/**
				 * Calculates the euclidian distance between two vec2's
				 *
				 * @param {vec2} a the first operand
				 * @param {vec2} b the second operand
				 * @returns {Number} distance between a and b
				 */
				vec2.distance = function (a, b) {
					var x = b[0] - a[0],
						y = b[1] - a[1];
					return Math.sqrt(x * x + y * y);
				};

				/**
				 * Alias for {@link vec2.distance}
				 * @function
				 */
				vec2.dist = vec2.distance;

				/**
				 * Calculates the squared euclidian distance between two vec2's
				 *
				 * @param {vec2} a the first operand
				 * @param {vec2} b the second operand
				 * @returns {Number} squared distance between a and b
				 */
				vec2.squaredDistance = function (a, b) {
					var x = b[0] - a[0],
						y = b[1] - a[1];
					return x * x + y * y;
				};

				/**
				 * Alias for {@link vec2.squaredDistance}
				 * @function
				 */
				vec2.sqrDist = vec2.squaredDistance;

				/**
				 * Calculates the length of a vec2
				 *
				 * @param {vec2} a vector to calculate length of
				 * @returns {Number} length of a
				 */
				vec2.length = function (a) {
					var x = a[0],
						y = a[1];
					return Math.sqrt(x * x + y * y);
				};

				/**
				 * Alias for {@link vec2.length}
				 * @function
				 */
				vec2.len = vec2.length;

				/**
				 * Calculates the squared length of a vec2
				 *
				 * @param {vec2} a vector to calculate squared length of
				 * @returns {Number} squared length of a
				 */
				vec2.squaredLength = function (a) {
					var x = a[0],
						y = a[1];
					return x * x + y * y;
				};

				/**
				 * Alias for {@link vec2.squaredLength}
				 * @function
				 */
				vec2.sqrLen = vec2.squaredLength;

				/**
				 * Negates the components of a vec2
				 *
				 * @param {vec2} out the receiving vector
				 * @param {vec2} a vector to negate
				 * @returns {vec2} out
				 */
				vec2.negate = function (out, a) {
					out[0] = -a[0];
					out[1] = -a[1];
					return out;
				};

				/**
				 * Returns the inverse of the components of a vec2
				 *
				 * @param {vec2} out the receiving vector
				 * @param {vec2} a vector to invert
				 * @returns {vec2} out
				 */
				vec2.inverse = function (out, a) {
					out[0] = 1.0 / a[0];
					out[1] = 1.0 / a[1];
					return out;
				};

				/**
				 * Normalize a vec2
				 *
				 * @param {vec2} out the receiving vector
				 * @param {vec2} a vector to normalize
				 * @returns {vec2} out
				 */
				vec2.normalize = function (out, a) {
					var x = a[0],
						y = a[1];
					var len = x * x + y * y;
					if (len > 0) {
						//TODO: evaluate use of glm_invsqrt here?
						len = 1 / Math.sqrt(len);
						out[0] = a[0] * len;
						out[1] = a[1] * len;
					}
					return out;
				};

				/**
				 * Calculates the dot product of two vec2's
				 *
				 * @param {vec2} a the first operand
				 * @param {vec2} b the second operand
				 * @returns {Number} dot product of a and b
				 */
				vec2.dot = function (a, b) {
					return a[0] * b[0] + a[1] * b[1];
				};

				/**
				 * Computes the cross product of two vec2's
				 * Note that the cross product must by definition produce a 3D vector
				 *
				 * @param {vec3} out the receiving vector
				 * @param {vec2} a the first operand
				 * @param {vec2} b the second operand
				 * @returns {vec3} out
				 */
				vec2.cross = function (out, a, b) {
					var z = a[0] * b[1] - a[1] * b[0];
					out[0] = out[1] = 0;
					out[2] = z;
					return out;
				};

				/**
				 * Performs a linear interpolation between two vec2's
				 *
				 * @param {vec2} out the receiving vector
				 * @param {vec2} a the first operand
				 * @param {vec2} b the second operand
				 * @param {Number} t interpolation amount between the two inputs
				 * @returns {vec2} out
				 */
				vec2.lerp = function (out, a, b, t) {
					var ax = a[0],
						ay = a[1];
					out[0] = ax + t * (b[0] - ax);
					out[1] = ay + t * (b[1] - ay);
					return out;
				};

				/**
				 * Generates a random vector with the given scale
				 *
				 * @param {vec2} out the receiving vector
				 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
				 * @returns {vec2} out
				 */
				vec2.random = function (out, scale) {
					scale = scale || 1.0;
					var r = glMatrix.RANDOM() * 2.0 * Math.PI;
					out[0] = Math.cos(r) * scale;
					out[1] = Math.sin(r) * scale;
					return out;
				};

				/**
				 * Transforms the vec2 with a mat2
				 *
				 * @param {vec2} out the receiving vector
				 * @param {vec2} a the vector to transform
				 * @param {mat2} m matrix to transform with
				 * @returns {vec2} out
				 */
				vec2.transformMat2 = function (out, a, m) {
					var x = a[0],
						y = a[1];
					out[0] = m[0] * x + m[2] * y;
					out[1] = m[1] * x + m[3] * y;
					return out;
				};

				/**
				 * Transforms the vec2 with a mat2d
				 *
				 * @param {vec2} out the receiving vector
				 * @param {vec2} a the vector to transform
				 * @param {mat2d} m matrix to transform with
				 * @returns {vec2} out
				 */
				vec2.transformMat2d = function (out, a, m) {
					var x = a[0],
						y = a[1];
					out[0] = m[0] * x + m[2] * y + m[4];
					out[1] = m[1] * x + m[3] * y + m[5];
					return out;
				};

				/**
				 * Transforms the vec2 with a mat3
				 * 3rd vector component is implicitly '1'
				 *
				 * @param {vec2} out the receiving vector
				 * @param {vec2} a the vector to transform
				 * @param {mat3} m matrix to transform with
				 * @returns {vec2} out
				 */
				vec2.transformMat3 = function (out, a, m) {
					var x = a[0],
						y = a[1];
					out[0] = m[0] * x + m[3] * y + m[6];
					out[1] = m[1] * x + m[4] * y + m[7];
					return out;
				};

				/**
				 * Transforms the vec2 with a mat4
				 * 3rd vector component is implicitly '0'
				 * 4th vector component is implicitly '1'
				 *
				 * @param {vec2} out the receiving vector
				 * @param {vec2} a the vector to transform
				 * @param {mat4} m matrix to transform with
				 * @returns {vec2} out
				 */
				vec2.transformMat4 = function (out, a, m) {
					var x = a[0],
						y = a[1];
					out[0] = m[0] * x + m[4] * y + m[12];
					out[1] = m[1] * x + m[5] * y + m[13];
					return out;
				};

				/**
				 * Perform some operation over an array of vec2s.
				 *
				 * @param {Array} a the array of vectors to iterate over
				 * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
				 * @param {Number} offset Number of elements to skip at the beginning of the array
				 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
				 * @param {Function} fn Function to call for each vector in the array
				 * @param {Object} [arg] additional argument to pass to fn
				 * @returns {Array} a
				 * @function
				 */
				vec2.forEach = (function () {
					var vec = vec2.create();

					return function (a, stride, offset, count, fn, arg) {
						var i, l;
						if (!stride) {
							stride = 2;
						}

						if (!offset) {
							offset = 0;
						}

						if (count) {
							l = Math.min((count * stride) + offset, a.length);
						} else {
							l = a.length;
						}

						for (i = offset; i < l; i += stride) {
							vec[0] = a[i]; vec[1] = a[i + 1];
							fn(vec, vec, arg);
							a[i] = vec[0]; a[i + 1] = vec[1];
						}

						return a;
					};
				})();

				/**
				 * Returns a string representation of a vector
				 *
				 * @param {vec2} vec vector to represent as a string
				 * @returns {String} string representation of the vector
				 */
				vec2.str = function (a) {
					return 'vec2(' + a[0] + ', ' + a[1] + ')';
				};

				module.exports = vec2;


				/***/
}
/******/])
	});
	;
}
