import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean
  busyLabel?: string
  children: ReactNode
}

export default function BusyButton({
  busy = false,
  busyLabel,
  children,
  disabled,
  className = '',
  type = 'button',
  ...rest
}: Props) {
  const isDisabled = disabled || busy

  return (
    <button
      type={type}
      className={className}
      disabled={isDisabled}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? (
        <>
          <span className="btn-spinner" aria-hidden="true" />
          <span>{busyLabel ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
