import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App root', () => {
  it('renders login form by default', () => {
    render(<App />)

    // powinna pojawić się etykieta "Nazwa Użytkownika"
    const usernameLabel = screen.getByText(/Nazwa Użytkownika/i)
    expect(usernameLabel).toBeInTheDocument()

    // w formularzu jest też pole Hasło
    const passwordInput = screen.getByPlaceholderText(/\*{8}/) // placeholder="********"
    expect(passwordInput).toBeInTheDocument()

    // oraz przycisk Zaloguj
    const loginButton = screen.getByRole('button', { name: /zaloguj/i })
    expect(loginButton).toBeInTheDocument()
  })
})