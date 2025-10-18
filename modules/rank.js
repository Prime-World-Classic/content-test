

export class Rank {

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