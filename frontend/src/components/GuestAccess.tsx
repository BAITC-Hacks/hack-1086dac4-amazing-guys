import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Check,
  Files,
  LoaderCircle,
  LogIn,
  UserRound,
  X,
} from "lucide-react";
import { delay } from "../api";

const SESSION_KEY = "kontur.guest";

function hasGuestSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "active";
  } catch {
    return false;
  }
}

export function GuestAccess({ onEnter }: { onEnter: () => void }) {
  const [guest, setGuest] = useState(hasGuestSession);
  const [pending, setPending] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const entryButton = useRef<HTMLButtonElement>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  function close() {
    controller.current?.abort();
    controller.current = null;
    setPending(false);
    dialog.current?.close();
  }

  async function enter() {
    if (guest) {
      close();
      return;
    }
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    setPending(true);
    try {
      await delay(700, request.signal);
      try {
        sessionStorage.setItem(SESSION_KEY, "active");
      } catch {
        // Guest access also works when the browser blocks storage.
      }
      setGuest(true);
      close();
      onEnter();
    } catch {
      // Closing the dialog cancels the local transition.
    } finally {
      if (controller.current === request) {
        controller.current = null;
        setPending(false);
      }
    }
  }

  return (
    <>
      <button
        className={`account-button${guest ? " is-guest" : ""}`}
        aria-haspopup="dialog"
        aria-controls="guest-access-dialog"
        onClick={() => {
          dialog.current?.showModal();
          entryButton.current?.focus();
        }}
      >
        {guest ? (
          <UserRound size={17} aria-hidden="true" />
        ) : (
          <LogIn size={17} aria-hidden="true" />
        )}
        {guest ? "Гость" : "Войти"}
      </button>
      {createPortal(
        <dialog
          ref={dialog}
          id="guest-access-dialog"
          className="guest-dialog"
          aria-labelledby="guest-title"
          aria-describedby="guest-description"
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onClose={close}
          onKeyDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              const bounds = event.currentTarget.getBoundingClientRect();
              if (
                event.clientX < bounds.left ||
                event.clientX > bounds.right ||
                event.clientY < bounds.top ||
                event.clientY > bounds.bottom
              )
                close();
            }
          }}
        >
          <button
            className="icon-button guest-close"
            aria-label="Закрыть окно входа"
            onClick={close}
          >
            <X size={20} />
          </button>
          <div className="guest-wordmark">
            <span className="brand-mark">
              <Files size={24} aria-hidden="true" />
            </span>
            <div>
              Kontur<small lang="en">organizational intelligence</small>
            </div>
          </div>
          <h2 id="guest-title">
            {guest ? "Вы в гостевом режиме" : "Войти в Kontur"}
          </h2>
          <p id="guest-description">
            {guest
              ? "Продолжайте сравнение документов и проверку источников."
              : "Начните работу с документами без регистрации."}
          </p>
          <button
            className="guest-enter"
            ref={entryButton}
            disabled={pending}
            onClick={enter}
          >
            {pending ? (
              <LoaderCircle size={19} className="spin" aria-hidden="true" />
            ) : guest ? (
              <Check size={19} aria-hidden="true" />
            ) : (
              <UserRound size={19} aria-hidden="true" />
            )}
            <span>
              {pending
                ? "Открываем пространство…"
                : guest
                  ? "Продолжить работу"
                  : "Войти как гость"}
            </span>
            {!pending && <ArrowRight size={18} aria-hidden="true" />}
          </button>
          <p className="guest-note" role="status">
            {pending
              ? "Подготовка гостевого режима…"
              : "Без аккаунта. История анализов между сессиями не сохраняется."}
          </p>
        </dialog>,
        document.body,
      )}
    </>
  );
}
