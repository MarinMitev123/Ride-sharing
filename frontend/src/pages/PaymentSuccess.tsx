import { Link } from 'react-router-dom'

export function PaymentSuccess() {
  return (
    <div className="app-main page-content">
      <h1>Плащането е успешно</h1>
      <p>Резервацията ви беше платена успешно с карта чрез защитената Stripe Checkout страница.</p>
      <p>Ако не виждате статус "Платено", изчакайте няколко секунди за webhook потвърждението и опреснете страницата.</p>
      <p style={{ marginTop: 16 }}>
        <Link to="/my-bookings">Към моите резервации</Link>
      </p>
    </div>
  )
}
