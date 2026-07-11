type Props = {
  error: string
  notice: string
}

export default function AuthMessages({ error, notice }: Props) {
  if (!error && !notice) return null
  return (
    <>
      {error && (
        <p className="auth-msg auth-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="auth-msg auth-notice">{notice}</p>}
    </>
  )
}
