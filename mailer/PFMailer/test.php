<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require '../Phpmailer/Exception.php';
require '../Phpmailer/PHPMailer.php';
require '../Phpmailer/SMTP.php';

email();

function email(){
    
    $contenido=utf8_decode("<html><body><h1>Holaaaa</h1></body></html>");
    $mail = new PHPMailer(true);

    try {
        $mail->SMTPDebug = 0;
        $mail->isSMTP();
        $mail->Host = 'smtp.hostinger.com';
        $mail->Port = 465;
        $mail->SMTPAuth = true;
        $mail->Username = 'premium_freight@grammermx.com';
        $mail->Password = 'FreightSystem2025.';
        $mail->SMTPSecure = 'ssl';

        $mail->setFrom('premium_freight@grammermx.com', 'Avisos Premium Freight');

            $mail->addAddress('Jesus.Perez@grammer.com', 'IT');

        $mail->Subject = 'Prueba PF';
        $mail->isHTML(true);
        $mail->Body = $contenido;
        

        if (!$mail->send()) {
            echo 'Mailer Error: ' . $mail->ErrorInfo;
        } else {
            echo 'enviado';

        }

    } catch (Exception $e) {
        echo $e;
    }
}


?>