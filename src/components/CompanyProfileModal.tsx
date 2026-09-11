import React, { useState, useRef } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  FileText,
  MapPin,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import type { Organization } from '../types';
import { saveOrganization, convertFileToDataUrl, getCurrentUser } from '../services/supabaseClient';

interface CompanyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization | null;
  onSaveOrganization: (org: Organization) => void;
  isFirstSetup?: boolean;
}

interface FormContentProps {
  onClose: () => void;
  organization: Organization | null;
  onSaveOrganization: (org: Organization) => void;
  isFirstSetup?: boolean;
}

const CompanyProfileDialogContent: React.FC<FormContentProps> = ({
  onClose,
  organization,
  onSaveOrganization,
  isFirstSetup = false,
}) => {
  const [name, setName] = useState(organization?.name || '');
  const [phone, setPhone] = useState(organization?.phone || '');
  const [email, setEmail] = useState(organization?.email || '');
  const [inn, setInn] = useState(organization?.inn || '');
  const [address, setAddress] = useState(organization?.address || '');
  const [logoUrl, setLogoUrl] = useState<string | null>(organization?.logoUrl || null);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg('Размер файла логотипа не должен превышать 3 МБ.');
      return;
    }

    try {
      const dataUrl = await convertFileToDataUrl(file);
      setLogoUrl(dataUrl);
      setErrorMsg(null);
    } catch {
      setErrorMsg('Не удалось обработать выбранный файл логотипа.');
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg('Пожалуйста, укажите название компании или бренда.');
      return;
    }

    setSaving(true);

    try {
      const user = await getCurrentUser();
      const res = await saveOrganization(
        {
          id: organization?.id,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          inn: inn.trim(),
          address: address.trim(),
          logoUrl: logoUrl,
          createdAt: organization?.createdAt,
        },
        user
      );

      if (res.success && res.organization) {
        onSaveOrganization(res.organization);
        setSuccessMsg('Профиль компании успешно сохранен!');
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setErrorMsg(res.error || 'Не удалось сохранить профиль компании.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Произошла непредвиденная ошибка.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 transition-all animate-in fade-in zoom-in-95 duration-200">
      {/* Шапка модального окна */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isFirstSetup ? 'Добро пожаловать! Настройка компании' : 'Профиль компании'}
            </h3>
            <p className="text-xs text-slate-500">
              {isFirstSetup
                ? 'Заполните данные вашей организации для вывода в сметах и шапке'
                : 'Эти реквизиты используются в сметах и расчетах'}
            </p>
          </div>
        </div>
        {!isFirstSetup && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Уведомления */}
      {errorMsg && (
        <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Форма редактирования */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Секция логотипа компании */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Логотип компании
          </label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 relative group">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Логотип компании"
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <Building2 className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <div className="space-y-1.5 flex-1">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png, image/jpeg, image/webp, image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
                id="company-logo-upload"
              />
              <div className="flex items-center gap-2">
                <label
                  htmlFor="company-logo-upload"
                  className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{logoUrl ? 'Заменить лого' : 'Загрузить логотип'}</span>
                </label>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition"
                    title="Удалить логотип"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Удалить</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Рекомендуется PNG, SVG или JPG до 3 МБ на прозрачном фоне.
              </p>
            </div>
          </div>
        </div>

        {/* Название компании */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Название компании / Бренда <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Building2 className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ООО «Тихие Стены»"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Контакты: Телефон и Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Телефон компании
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (495) 000-00-00"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email для смет
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="zakaz@tikhie-steny.ru"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>
        </div>

        {/* ИНН и Адрес */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              ИНН / ОГРН
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <FileText className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={inn}
                onChange={(e) => setInn(e.target.value)}
                placeholder="7701234567"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Фактический / Юр. адрес
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="г. Москва, ул. Примерная, 15"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Кнопки сохранения и закрытия */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          {!isFirstSetup && (
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Отмена
            </button>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-98 transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Сохранение...</span>
              </>
            ) : isFirstSetup ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Применить и продолжить</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Сохранить изменения</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export const CompanyProfileModal: React.FC<CompanyProfileModalProps> = ({
  isOpen,
  onClose,
  organization,
  onSaveOrganization,
  isFirstSetup = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <CompanyProfileDialogContent
        key={`${organization?.id || 'new'}-${isOpen}`}
        onClose={onClose}
        organization={organization}
        onSaveOrganization={onSaveOrganization}
        isFirstSetup={isFirstSetup}
      />
    </div>
  );
};
