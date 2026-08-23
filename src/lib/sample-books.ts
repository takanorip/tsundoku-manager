import type { Book } from "./types";

function sample(
  book: Omit<
    Book,
    | "description"
    | "currentPage"
    | "rating"
    | "tags"
    | "notes"
    | "startedAt"
    | "finishedAt"
    | "subtitle"
    | "asin"
    | "sourceUrl"
    | "price"
    | "publishedDate"
    | "publisher"
    | "pageCount"
    | "coverUrl"
    | "purchaseDate"
  > &
    Partial<Book>,
): Book {
  return {
    subtitle: null,
    asin: null,
    publisher: null,
    publishedDate: null,
    pageCount: null,
    currentPage: null,
    description: null,
    coverUrl: null,
    sourceUrl: null,
    purchaseDate: null,
    price: null,
    notes: null,
    rating: null,
    tags: [],
    startedAt: null,
    finishedAt: null,
    ...book,
  };
}

export const SAMPLE_BOOKS: Book[] = [
  sample({
    id: "sample-readable-code",
    title: "リーダブルコード",
    subtitle: "より良いコードを書くためのシンプルで実践的なテクニック",
    authors: ["Dustin Boswell", "Trevor Foucher", "角征典"],
    isbn13: "9784873115658",
    isbn10: "4873115655",
    asin: "4873115655",
    publisher: "オライリージャパン",
    publishedDate: "2012-06",
    pageCount: 260,
    coverUrl: "https://cover.openbd.jp/9784873115658.jpg",
    status: "UNREAD",
    source: "AMAZON",
    sourceUrl: "https://www.amazon.co.jp/dp/4873115655",
    purchaseDate: "2024-11-03",
    price: 2640,
    notes: "積んで一番気になっている技術書。",
    createdAt: "2024-11-03T00:00:00.000Z",
    updatedAt: "2024-11-03T00:00:00.000Z",
  }),
  sample({
    id: "sample-shiko-no-seiri",
    title: "思考の整理学",
    authors: ["外山滋比古"],
    isbn13: "9784480017017",
    isbn10: "4480017011",
    publisher: "筑摩書房",
    publishedDate: "2017-01",
    pageCount: 226,
    coverUrl: "https://cover.openbd.jp/9784480017017.jpg",
    status: "UNREAD",
    source: "BOOKSTORE",
    purchaseDate: "2023-08-20",
    price: 1650,
    createdAt: "2023-08-20T00:00:00.000Z",
    updatedAt: "2023-08-20T00:00:00.000Z",
  }),
  sample({
    id: "sample-programming-typescript",
    title: "プログラミングTypeScript",
    subtitle: "スケールするJavaScriptアプリケーション開発",
    authors: ["Boris Cherny", "今村謙士", "原隆文"],
    isbn13: "9784873119045",
    isbn10: "4873119049",
    publisher: "オライリージャパン",
    publishedDate: "2020-03",
    coverUrl: "https://cover.openbd.jp/9784873119045.jpg",
    status: "READING",
    source: "AMAZON",
    purchaseDate: "2025-02-11",
    price: 3520,
    currentPage: 120,
    startedAt: "2026-07-01",
    createdAt: "2025-02-11T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  }),
  sample({
    id: "sample-kirawareru-yuki",
    title: "嫌われる勇気",
    subtitle: "自己啓発の源流「アドラー」の教え",
    authors: ["岸見一郎", "古賀史健"],
    isbn13: "9784478025819",
    isbn10: "4478025819",
    publisher: "ダイヤモンド社",
    publishedDate: "2013-12",
    pageCount: 296,
    coverUrl: "https://cover.openbd.jp/9784478025819.jpg",
    status: "FINISHED",
    source: "RAKUTEN",
    purchaseDate: "2022-01-15",
    price: 1650,
    startedAt: "2022-02-01",
    finishedAt: "2022-02-20",
    rating: 4,
    createdAt: "2022-01-15T00:00:00.000Z",
    updatedAt: "2022-02-20T00:00:00.000Z",
  }),
  sample({
    id: "sample-yojohan",
    title: "四畳半神話大系",
    authors: ["森見登美彦"],
    isbn13: "9784043878017",
    isbn10: "404387801X",
    publisher: "KADOKAWA",
    publishedDate: "2008-03",
    coverUrl: "https://cover.openbd.jp/9784043878017.jpg",
    status: "UNREAD",
    source: "USED",
    purchaseDate: "2025-12-31",
    price: 550,
    createdAt: "2025-12-31T00:00:00.000Z",
    updatedAt: "2025-12-31T00:00:00.000Z",
  }),
  sample({
    id: "sample-react-hands-on",
    title: "Reactハンズオンラーニング",
    subtitle: "Webアプリケーション開発のベストプラクティス",
    authors: ["Alex Banks", "Eve Porcello", "宮崎空"],
    isbn13: "9784873119380",
    isbn10: "4873119383",
    publisher: "オライリージャパン",
    publishedDate: "2021-07",
    coverUrl: "https://cover.openbd.jp/9784873119380.jpg",
    status: "PAUSED",
    source: "KINDLE",
    purchaseDate: "2024-05-08",
    currentPage: 90,
    startedAt: "2024-06-01",
    notes: "Hooks の章で止まっている。",
    createdAt: "2024-05-08T00:00:00.000Z",
    updatedAt: "2024-06-01T00:00:00.000Z",
  }),
];
