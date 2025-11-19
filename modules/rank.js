import { Lang } from "./lang.js";

export class Rank {
  static _names = null;

  static get name() {
    if (!Rank._names) {
      Rank._names = [
        "",
        Lang.text("rankRecruit"),
        Lang.text("rankMercenary"),
        Lang.text("rankPrivate"),
        Lang.text("rankCorporal"),
        Lang.text("rankSergeant"),
        Lang.text("rankLieutenant"),
        Lang.text("rankCaptain"),
        Lang.text("rankMajor"),
        Lang.text("rankLieutenantColonel"),
        Lang.text("rankColonel"),
        Lang.text("rankGeneral"),
        Lang.text("rankMarshal"),
        Lang.text("rankGod"),
      ];
    }

    return Rank._names;
  }

  static icon(rating) {
    if (rating <= 1199) {
      return 1;
    } else if (rating <= 1299) {
      return 2;
    } else if (rating <= 1399) {
      return 3;
    } else if (rating <= 1499) {
      return 4;
    } else if (rating <= 1599) {
      return 5;
    } else if (rating <= 1699) {
      return 6;
    } else if (rating <= 1799) {
      return 7;
    } else if (rating <= 1899) {
      return 8;
    } else if (rating <= 1999) {
      return 9;
    } else if (rating <= 2099) {
      return 10;
    } else if (rating <= 2199) {
      return 11;
    } else {
      return 12;
    }
  }

  static getName(rating) {
    return Rank.name[Rank.icon(rating)];
  }
}
