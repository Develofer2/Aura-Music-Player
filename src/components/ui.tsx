/** Reusable UI primitives: Button, Field, Select, Slider, Modal, Artwork. Copyright (c) 2026 Develofer2. MIT License. */
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import * as SelectPrimitive from "@radix-ui/react-select"
import { X, Check, ChevronDown, ChevronUp } from "lucide-react"
import { Children, isValidElement, useEffect, useState } from "react"
import { database } from "../storage"
export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger"
}) {
  return <button {...props} className={`button ${variant} ${className}`} />
}
export function IconButton({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <Button
      variant="ghost"
      {...props}
      aria-label={label}
      title={label}
      className={`icon-button ${className}`}
    >
      {children}
    </Button>
  )
}
export function Field(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field ${props.className || ""}`} />
}
type SelectProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value" | "defaultValue" | "onChange" | "children"> & {
  value?: string | number
  defaultValue?: string | number
  onValueChange?: (value: string) => void
  children: ReactNode
  required?: boolean
  icon?: ReactNode
}
interface ChoiceProps {
  value?: string | number
  children?: ReactNode
  disabled?: boolean
}
export function Select({
  value,
  defaultValue,
  onValueChange,
  children,
  disabled,
  required,
  name,
  form,
  className = "",
  icon,
  ...triggerProps
}: SelectProps) {
  const options = Children.toArray(children).flatMap((child) => {
    if (!isValidElement<ChoiceProps>(child)) return []
    return [
      {
        value: String(child.props.value ?? child.props.children ?? ""),
        label: child.props.children,
        disabled: child.props.disabled,
      },
    ]
  })
  const placeholder = options.find((option) => option.value === "")?.label
  const initialValue =
    defaultValue === undefined
      ? placeholder
        ? undefined
        : options[0]?.value
      : String(defaultValue)
  return (
    <SelectPrimitive.Root
      value={value === undefined ? undefined : String(value)}
      defaultValue={initialValue}
      onValueChange={onValueChange}
      disabled={disabled}
      required={required}
      name={name}
      form={form}
    >
      <SelectPrimitive.Trigger
        {...triggerProps}
        form={form}
        className={`field select select-trigger ${className}`}
      >
        <SelectPrimitive.Value
          placeholder={placeholder || "Choose an option"}
        />
        {icon && (
          <SelectPrimitive.Icon className="select-leading-icon">
            {icon}
          </SelectPrimitive.Icon>
        )}
        <SelectPrimitive.Icon className="select-chevron">
          <ChevronDown size={16} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="select-menu"
          position="popper"
          sideOffset={6}
          collisionPadding={16}
        >
          <SelectPrimitive.ScrollUpButton className="select-scroll-button">
            <ChevronUp size={16} />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="select-viewport">
            {options
              .filter((option) => option.value !== "")
              .map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  data-value={option.value}
                  disabled={option.disabled}
                  className="select-option"
                >
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="select-indicator">
                    <Check size={15} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="select-scroll-button">
            <ChevronDown size={16} />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
export function Heading({
  children,
  level = 2,
  className = "",
}: {
  children: ReactNode
  level?: 1 | 2 | 3
  className?: string
}) {
  const Tag = `h${level}` as "h1" | "h2" | "h3"
  return <Tag className={className}>{children}</Tag>
}
export function Slider({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <Field type="range" aria-label={label} {...props} />
}
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className: contentClassName = "",
  modal = true,
  onCloseAutoFocus,
  hideClose = false,
  swipeToClose = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  className?: string
  modal?: boolean
  onCloseAutoFocus?: (event: Event) => void
  hideClose?: boolean
  swipeToClose?: boolean
}) {
  const [content, setContent] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (!content || !swipeToClose) return
    let startY = 0,
      startX = 0,
      dy = 0,
      dragging = false,
      tracking = false,
      last = 0,
      speed = 0,
      frame = 0
    const paint = () => {
      frame = 0
      content.style.translate = `0 ${dy}px`
    }
    const begin = (target: HTMLElement, x: number, y: number) => {
      tracking =
        content.scrollTop <= 0 &&
        !target.closest(
          'input,textarea,select,button,a,[data-scrub],[role="combobox"],[role="slider"]',
        )
      dragging = false
      dy = 0
      speed = 0
      startX = x
      startY = y
      last = performance.now()
    }
    const track = (x: number, y: number) => {
      if (!tracking) return false
      const d = y - startY
      if (!dragging) {
        if (d > 8 && d > Math.abs(x - startX)) {
          dragging = true
          content.classList.add("dragging")
          content.style.animation = "none"
        } else {
          if (d < -8 || content.scrollTop > 0) tracking = false
          return false
        }
      }
      const now = performance.now()
      speed = (d - dy) / Math.max(1, now - last)
      last = now
      dy = Math.max(0, d)
      if (!frame) frame = requestAnimationFrame(paint)
      return true
    }
    const reset = () => {
      content.classList.remove("dragging")
      content.style.translate = ""
      content.style.transition = ""
      content.style.animation = ""
    }
    const finish = () => {
      if (!dragging) return
      dragging = false
      tracking = false
      cancelAnimationFrame(frame)
      frame = 0
      if (dy > 110 || speed > 0.55) {
        content.style.transition = "translate .28s cubic-bezier(.4,0,1,1), opacity .28s"
        content.style.translate = "0 100vh"
        content.style.opacity = "0"
        setTimeout(() => {
          onClose()
          setTimeout(() => {
            reset()
            content.style.opacity = ""
          }, 80)
        }, 240)
      } else {
        content.style.transition = "translate .3s cubic-bezier(.22,1,.36,1)"
        content.style.translate = "0 0"
        setTimeout(reset, 320)
      }
    }
    const touchStart = (e: TouchEvent) =>
      begin(e.target as HTMLElement, e.touches[0].clientX, e.touches[0].clientY)
    const touchMove = (e: TouchEvent) => {
      if (track(e.touches[0].clientX, e.touches[0].clientY)) e.preventDefault()
    }
    const mouseMove = (e: MouseEvent) => {
      if (track(e.clientX, e.clientY)) e.preventDefault()
    }
    const mouseUp = () => {
      window.removeEventListener("mousemove", mouseMove)
      window.removeEventListener("mouseup", mouseUp)
      finish()
    }
    const mouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      begin(e.target as HTMLElement, e.clientX, e.clientY)
      window.addEventListener("mousemove", mouseMove)
      window.addEventListener("mouseup", mouseUp)
    }
    content.addEventListener("touchstart", touchStart, { passive: true })
    content.addEventListener("touchmove", touchMove, { passive: false })
    content.addEventListener("touchend", finish)
    content.addEventListener("touchcancel", finish)
    content.addEventListener("mousedown", mouseDown)
    return () => {
      cancelAnimationFrame(frame)
      content.removeEventListener("touchstart", touchStart)
      content.removeEventListener("touchmove", touchMove)
      content.removeEventListener("touchend", finish)
      content.removeEventListener("touchcancel", finish)
      content.removeEventListener("mousedown", mouseDown)
      window.removeEventListener("mousemove", mouseMove)
      window.removeEventListener("mouseup", mouseUp)
    }
  }, [content, swipeToClose, onClose])
  return (
    <DialogPrimitive.Root
      modal={modal}
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="modal-overlay" />
        <DialogPrimitive.Content
          ref={setContent}
          onCloseAutoFocus={onCloseAutoFocus}
          className={
            contentClassName
              ? `modal-content ${contentClassName}`
              : "modal-content"
          }
        >
          {swipeToClose && <span className="sheet-handle" aria-hidden="true" />}
          <div className="section-heading">
            <DialogPrimitive.Title className="modal-title">
              {title}
            </DialogPrimitive.Title>
            {!hideClose && (
              <DialogPrimitive.Close asChild>
                <IconButton label="Close dialog">
                  <X size={20} />
                </IconButton>
              </DialogPrimitive.Close>
            )}
          </div>
          <DialogPrimitive.Description
            className={description ? "muted modal-description" : "sr-only"}
          >
            {description || title}
          </DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
export const artworkEvent = "aura-artwork-changed"
export function Artwork({
  id,
  title = "",
  className = "",
}: {
  id?: string
  title?: string
  className?: string
}) {
  const [url, setUrl] = useState<string>(),
    [version, setVersion] = useState(0)
  useEffect(() => {
    const on = (e: Event) => {
      if ((e as CustomEvent<string>).detail === id) setVersion((v) => v + 1)
    }
    window.addEventListener(artworkEvent, on)
    return () => window.removeEventListener(artworkEvent, on)
  }, [id])
  useEffect(() => {
    let active = true,
      objectUrl: string | undefined
    setUrl(undefined)
    if (id)
      database()
        .then((db) => db.get("artwork", id))
        .then((artwork) => {
          if (artwork && active) {
            objectUrl = URL.createObjectURL(artwork)
            setUrl(objectUrl)
          }
        })
        .catch(() => {})
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id, version])
  const seed = [...(id || "aura")].reduce((v, c) => v + c.charCodeAt(0), 0) % 6
  return (
    <div className={`artwork art-${seed} ${className}`}>
      {url ? (
        <img src={url} alt={title ? `${title} artwork` : ""} />
      ) : (
        <>
          <div className="art-orbit" />
          <div className="cover-sculpture" aria-hidden="true">
            <div />
            <div />
            <div />
          </div>
          <span className="cover-wordmark" aria-hidden="true">
            AURA / LOCAL COLLECTION
          </span>
        </>
      )}
    </div>
  )
}
export default Button
