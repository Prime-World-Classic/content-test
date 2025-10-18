import { DataBase } from './database.js';

export class News {
	// создаем локальную базу данных
	static async init() {

		News.db = new DataBase('list', [{ name: 'list', options: { keyPath: 'id' } }], 1);

		await News.db.init();

	}

	static async create(text, id = 0) {

		if (!id) {
			// локальная новость с отрицательным идентификатором
			id = -Date.now();

		}

		id = Number(id);

		if (await News.db.get('list', id)) {

			return;

		}
		// id - угикальный ключ, text - текст, status - прочитано да/нет, иначе уведомление? 
		await News.db.add('list', { id: id, text: text, status: 0 });

	}

	static async update() {

		//let request = await App.api.request('user','news');
		let request = [{ id: 'Привет мир!', text: 'Тестовая новость с сервера' }]; // демо данные

		for (let item of request) {

			News.create(item.id, item.text);

		}

	}
	// выводим все новости
	static async view() {

		let list = await News.db.getAll('list'), notifications = 0;

		for (let item of list) {

			if (!item.status) {

				notifications++;

			}

		}
		// list - список новостей, notifications - количество не прочитанных новостей (уведомления)
		return { list: list, notifications: notifications };

	}
	// вешаем событие на мышь или любой другой способ, чтобы убедиться, что пользователь прочитал новость
	static async onStatus(id) {

		await News.set(id, { status: 1 });

	}

	static async set(id, object) {

		if ('id' in object) {

			throw 'Нельзя перезаписать идентификатор';

		}

		id = Number(id);

		let item = await News.db.get('list', id);

		if (!item) {

			throw 'Новость не найдена';

		}

		await News.db.add('list', Object.assign(item, object));

	}

}
