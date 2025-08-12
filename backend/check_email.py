import imaplib
import email

IMAP_SERVER = 'imap.gmail.com'
EMAIL_ACCOUNT = 'aiforexkoo@gmail.com'  # 너의 지메일 주소
PASSWORD = 'jloyxkpcnqkaajiw'          # 구글 앱 비밀번호 (2단계 인증 후 생성한 것)

PROCESSED_LABEL = 'Processed'  # Gmail에서 만든 라벨 이름

def move_to_label(mail, uid, label):
    # Gmail에서는 COPY + STORE + EXPUNGE 로 라벨 이동 구현
    mail.uid('COPY', uid, label)
    mail.uid('STORE', uid, '+FLAGS', '\\Deleted')
    mail.expunge()

def check_and_process_mail():
    mail = imaplib.IMAP4_SSL(IMAP_SERVER)
    mail.login(EMAIL_ACCOUNT, PASSWORD)
    mail.select('INBOX')

    result, data = mail.uid('search', None, 'UNSEEN')
    if result != 'OK':
        print("No new emails")
        return

    uids = data[0].split()
    for uid in uids:
        result, msg_data = mail.uid('fetch', uid, '(RFC822)')
        if result != 'OK':
            continue
        raw_email = msg_data[0][1]
        msg = email.message_from_bytes(raw_email)

        subject = msg['subject']
        from_ = msg['from']
        print(f'New mail from {from_}: {subject}')
        # TODO: 신호 처리하는 코드 여기에 작성

        move_to_label(mail, uid, PROCESSED_LABEL)

    mail.logout()

if __name__ == '__main__':
    check_and_process_mail()