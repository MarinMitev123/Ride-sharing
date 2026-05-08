import { Link } from 'react-router-dom'

export function PaymentCancel() {
  return (
    <div className="app-main page-content">
      <h1>Плащането е отказано</h1>
      <p>Плащането не беше завършено. Няма извършено таксуване.</p>
      <p>Може да се върнете към резервацията и да стартирате плащането отново.</p>
      <p style={{ marginTop: 16 }}>
        <Link to="/my-bookings">Към моите резервации</Link>
      </p>
    </div>
  )
}
