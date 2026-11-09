import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  MessageCircle,
  Plus,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { useStore } from "../../app/store";
import { WorkCard } from "../../components/Cards";
import { PublishWork } from "./PublishWork";
import { money } from "../../data/mock";
export function Studio() {
  const store = useStore();
  const [publish, setPublish] = useState(false),
    [tab, setTab] = useState("works");
  const works = store.workList.filter((work) => work.creatorId === "denis"),
    sales = store.purchases.filter((purchase) => purchase.sellerId === "denis"),
    comments = store.comments.filter((comment) =>
      works.some((work) => work.id === comment.workId),
    ),
    gross = sales.reduce((sum, purchase) => sum + purchase.amount, 0),
    fee = sales.reduce((sum, purchase) => sum + purchase.fee, 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">СОЗДАВАЙ ТО, ЧТО НУЖНО ИГРАМ</div>
          <h1>
            Мои публикации<span className="heading-dot">.</span>
          </h1>
          <p>Портфолио, услуги и ассеты на продажу.</p>
        </div>
        <button className="primary-btn" onClick={() => setPublish(true)}>
          <Plus size={17} />
          Опубликовать работу
        </button>
      </div>
      <div className="game-metrics studio-metrics">
        <div>
          <ShoppingBag size={18} />
          <span>Работ опубликовано</span>
          <strong>{works.length}</strong>
        </div>
        <div>
          <MessageCircle size={18} />
          <span>Комментарии</span>
          <strong>{comments.length}</strong>
        </div>
        <div>
          <Wallet size={18} />
          <span>Продажи · демо</span>
          <strong>{money(gross)}</strong>
        </div>
        <div>
          <span>Доход после комиссии · демо</span>
          <strong>{money(gross - fee)}</strong>
        </div>
      </div>
      <div className="profile-tabs" role="tablist" aria-label="Мастерская">
        <button
          role="tab"
          aria-selected={tab === "works"}
          className={tab === "works" ? "active" : ""}
          onClick={() => setTab("works")}
        >
          Мои работы<span>{works.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === "sales"}
          className={tab === "sales" ? "active" : ""}
          onClick={() => setTab("sales")}
        >
          Продажи<span>{sales.length}</span>
        </button>
      </div>
      {tab === "works" ? (
        <div className="work-grid">
          {works.map((work) => (
            <WorkCard key={work.id} work={work} />
          ))}
        </div>
      ) : (
        <>
          <div className="sales-summary">
            <h2>Продажи и начисления</h2>
            <p className="form-note">
              Тестовая комиссия — 10%. Реальные платежи и вывод средств не
              подключены.
            </p>
          </div>
          {sales.length ? (
            <div className="task-table-scroll">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Работа</th>
                    <th>Дата</th>
                    <th>Стоимость</th>
                    <th>Комиссия</th>
                    <th>Доход</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id}>
                      <td>
                        {
                          store.workList.find((work) => work.id === sale.workId)
                            ?.title
                        }
                      </td>
                      <td>
                        {new Date(sale.createdAt).toLocaleDateString("ru-RU")}
                      </td>
                      <td>{money(sale.amount)}</td>
                      <td>{money(sale.fee)}</td>
                      <td>{money(sale.amount - sale.fee)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <Wallet size={32} />
              <h2>Пока без продаж</h2>
              <button
                className="secondary-btn"
                onClick={() => setPublish(true)}
              >
                <Plus size={16} />
                Опубликовать ассет
              </button>
            </div>
          )}
        </>
      )}
      {publish && <PublishWork onClose={() => setPublish(false)} />}
    </>
  );
}
export function Library() {
  const store = useStore();
  const ids = new Set(
    store.purchases.filter((p) => p.buyerId === "denis").map((p) => p.workId),
  );
  const works = store.workList.filter((work) => ids.has(work.id));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ВСЁ ДЛЯ ТВОИХ МИРОВ</div>
          <h1>
            Библиотека<span className="heading-dot">.</span>
          </h1>
          <p>Приобретённые работы для твоих игр.</p>
        </div>
        <Link className="secondary-btn" to="/market">
          К работам
          <ArrowUpRight size={16} />
        </Link>
      </div>
      {works.length ? (
        <div className="work-grid">
          {works.map((work) => (
            <WorkCard key={work.id} work={work} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <ShoppingBag size={35} />
          <h2>Здесь появятся твои ассеты</h2>
          <Link className="primary-btn" to="/market?category=art">
            Найти первую работу
            <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
    </>
  );
}
