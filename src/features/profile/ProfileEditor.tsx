import { useState, type FormEvent } from "react";
import { Check, ImagePlus, X } from "lucide-react";
import type { Creator } from "../../data/types";
import { availabilityLabels, creatorSpecialties, profileSettingsSchema, specialties, type ProfileSettings } from "../../data/people";
import { useStore } from "../../app/store";
import { readGameImage } from "../games/imageData";
import { UiSelect } from "../../components/UiSelect";

export function ProfileEditor({ creator, onClose }: { creator: Creator; onClose: () => void }) {
  const store = useStore();
  const [draft, setDraft] = useState<ProfileSettings>(() => ({
    name: creator.name, handle: creator.handle, role: creator.role, bio: creator.bio,
    skills: creator.skills, specialties: creatorSpecialties(creator, store.workList),
    availability: creator.availability ?? "open", location: creator.location ?? "Удалённо",
    avatar: creator.avatar, cover: creator.cover,
  }));
  const [skills, setSkills] = useState(creator.skills.join(", "));
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const update = (patch: Partial<ProfileSettings>) => setDraft((old) => ({ ...old, ...patch }));
  async function upload(file: File | undefined, field: "avatar" | "cover") {
    if (!file) return;
    setUploading(true); setError("");
    try { update({ [field]: await readGameImage(file) }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось загрузить фото"); }
    finally { setUploading(false); }
  }
  function save(event: FormEvent) {
    event.preventDefault();
    const parsed = profileSettingsSchema.safeParse({ ...draft, skills: [...new Set(skills.split(",").map((item) => item.trim()).filter(Boolean))] });
    if (!parsed.success) { setError("Проверьте поля: до 16 навыков по 40 знаков. Ник: латиница, цифры, точка, дефис или подчёркивание."); return; }
    if (store.creatorList.some((item) => item.id !== creator.id && item.handle.toLowerCase() === parsed.data.handle.toLowerCase())) { setError("Такой ник уже занят"); return; }
    if (store.saveProfile(parsed.data)) { store.setToast("Профиль сохранён в этом браузере"); onClose(); }
  }
  return <form className="profile-edit-form" onSubmit={save}>
    <header><h2>Настройки профиля</h2><button type="button" className="icon-btn" aria-label="Отменить изменения" onClick={onClose}><X size={20} /></button></header>
    <div className="profile-edit-grid">
      <label>Имя<input autoFocus required maxLength={60} value={draft.name} onChange={(event) => update({ name: event.target.value })} /></label>
      <label>Ник<input required minLength={2} maxLength={40} value={draft.handle} onChange={(event) => update({ handle: event.target.value })} /></label>
      <label>Специализация<input required maxLength={100} value={draft.role} onChange={(event) => update({ role: event.target.value })} /></label>
      <label>Доступность<UiSelect ariaLabel="Доступность" value={draft.availability} options={Object.entries(availabilityLabels).map(([value, label]) => ({ value, label }))} onChange={(value) => update({ availability: value as ProfileSettings["availability"] })} /></label>
      <label className="profile-edit-wide">О себе<textarea rows={4} maxLength={800} value={draft.bio} onChange={(event) => update({ bio: event.target.value })} /></label>
      <label>Навыки через запятую<input value={skills} maxLength={660} onChange={(event) => setSkills(event.target.value)} /></label>
      <label>Местоположение<input value={draft.location} maxLength={80} onChange={(event) => update({ location: event.target.value })} /></label>
      <fieldset className="profile-edit-wide"><legend>Направления</legend><div className="profile-specialties">{Object.entries(specialties).map(([id, label]) => <label key={id}><input type="checkbox" checked={draft.specialties.includes(id as keyof typeof specialties)} onChange={(event) => update({ specialties: event.target.checked ? [...draft.specialties, id as keyof typeof specialties] : draft.specialties.filter((item) => item !== id) })} />{label}</label>)}</div></fieldset>
      {(["avatar", "cover"] as const).map((field) => <div className="profile-photo-field" key={field}>
        <label><ImagePlus size={19} />{field === "avatar" ? "Фото профиля" : "Обложка"}<input type="file" accept="image/*" disabled={uploading} onChange={(event) => { void upload(event.target.files?.[0], field); event.currentTarget.value = ""; }} /></label>
        {draft[field] && <><img src={draft[field]} alt={field === "avatar" ? "Фото профиля" : "Обложка"} /><button className="text-action" type="button" onClick={() => update({ [field]: undefined })}>Убрать изображение</button></>}
      </div>)}
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <footer><button type="button" className="secondary-btn" onClick={onClose}>Отмена</button><button type="submit" className="primary-btn" disabled={uploading}><Check size={18} />{uploading ? "Загрузка фото" : "Сохранить"}</button></footer>
  </form>;
}
