import nodemailer from 'nodemailer'

const smtpHost = process.env.SMTP_HOST
const smtpPort = Number(process.env.SMTP_PORT || 587)
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const smtpFrom = process.env.SMTP_FROM

const getTransporter = () => {
  if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    throw new Error('Missing SMTP configuration (SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM).')
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  })
}

export const sendUserInviteEmail = async ({
  to,
  fullName,
  roleDisplay,
  setPasswordLink,
  tokenValidHours
}) => {
  const transporter = getTransporter()

  const subject = 'Dobrodosli u PICCOLA'
  const text = `Zdravo ${fullName},

Dobrodosli u PICCOLA aplikaciju za modni brend Piccola! 🎀

Vas nalog je kreiran i spreman za aktivaciju.

Podaci za prijavu:

Korisnicko ime (email): ${to}

Uloga: ${roleDisplay}

Da biste zavrsili podesavanje naloga, potrebno je da postavite svoju lozinku putem sledeceg linka (jednokratan je i vazi ${tokenValidHours} sati):

👉 Postavite lozinku: ${setPasswordLink}

Ako vi niste trazili kreiranje naloga, samo ignorisite ovaj mejl.

Srdacno,
PICCOLA tim
`

  const info = await transporter.sendMail({
    from: smtpFrom,
    to,
    subject,
    text
  })

  if (info.rejected && info.rejected.length > 0) {
    throw new Error(`Email rejected: ${info.rejected.join(', ')}`)
  }

  return info
}
