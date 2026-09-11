import React from 'react';
import { Download, X, Share, PlusSquare, Smartphone, CheckCircle2 } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  onNativeInstall?: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isIOS,
  onNativeInstall,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Шапка модального окна */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Установка «Тихие Стены PRO»</h3>
              <p className="text-xs text-slate-500">Работайте без браузера как в нативном приложении</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Преимущества PWA */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium text-slate-700">Быстрый запуск с рабочего стола</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium text-slate-700">Оффлайн-кэш и сохранность расчетов</span>
            </div>
          </div>

          {isIOS ? (
            /* Инструкция для iOS Safari */
            <div className="space-y-3 bg-blue-50/70 border border-blue-100 rounded-xl p-4 text-xs text-slate-700">
              <div className="font-bold text-blue-900 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-blue-600" />
                <span>Как установить на iPhone или iPad:</span>
              </div>
              <ol className="space-y-2.5 list-decimal list-inside pl-1 text-slate-600">
                <li className="leading-relaxed">
                  Нажмите кнопку <span className="inline-flex items-center gap-1 font-semibold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs"><Share className="w-3 h-3 text-blue-600" /> Поделиться</span> в нижней панели браузера Safari.
                </li>
                <li className="leading-relaxed">
                  Прокрутите список действий вниз и выберите <span className="inline-flex items-center gap-1 font-semibold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs"><PlusSquare className="w-3 h-3 text-blue-600" /> На экран «Домой»</span>.
                </li>
                <li className="leading-relaxed">
                  Нажмите <span className="font-semibold text-slate-900">«Добавить»</span> в правом верхнем углу экрана.
                </li>
              </ol>
            </div>
          ) : (
            /* Инструкция для Chrome/Android/Desktop */
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Нажмите кнопку ниже, чтобы запустить системную установку приложения на ваш компьютер или смартфон. Приложение появится в списке ваших программ и на рабочем столе.
              </p>
              {onNativeInstall && (
                <button
                  type="button"
                  onClick={() => {
                    onNativeInstall();
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-98 transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Установить сейчас</span>
                </button>
              )}
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Понятно, закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
