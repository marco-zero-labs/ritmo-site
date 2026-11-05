// The only place with the site's contact details. Change them here and every page follows.
(function () {
  var CONTACT = {
    // TODO: change to contato@marcozerolabs.com.br when the domain is registered.
    email: 'marcozerolabs@gmail.com',
    // TODO: the company's WhatsApp number, digits only, with country and area code.
    // Never a personal number. While this is empty, every WhatsApp button stays hidden.
    whatsapp: '',
    whatsappMessage: { pt: 'Olá, quero conhecer o Ritmo', en: "Hi, I'd like to learn about Ritmo" },
  };

  function each(selector, callback) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), callback);
  }

  document.addEventListener('DOMContentLoaded', function () {
    each('[data-email-link]', function (link) {
      var subject = link.dataset.subject;
      link.href = 'mailto:' + CONTACT.email + (subject ? '?subject=' + encodeURIComponent(subject) : '');
      if ('emailText' in link.dataset) link.textContent = CONTACT.email;
      link.hidden = false;
    });

    var number = CONTACT.whatsapp.replace(/\D/g, '');
    if (!number) return;
    var language = document.documentElement.lang.indexOf('pt') === 0 ? 'pt' : 'en';
    var href = 'https://wa.me/' + number + '?text=' + encodeURIComponent(CONTACT.whatsappMessage[language]);
    each('[data-whatsapp-link], [data-whatsapp-cta]', function (link) {
      link.href = href;
      link.hidden = false;
    });
    each('[data-whatsapp-item]', function (item) {
      item.hidden = false;
    });
  });
})();
