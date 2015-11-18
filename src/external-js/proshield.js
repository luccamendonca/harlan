/* global toastr, addScreenState, require, userScreenState */

var SEARCH_REGEX = /pros?h?i?e?l?d?/i;

(function (controller) {
    var CPF = require("cpf_cnpj").CPF;
    var emailRegex = require("email-regex");
    var userScreenState = null;

    var emptyCall = function () {
        /* @void */
    };
    
    var proshieldSection = function () {
        var proshieldSection = controller.call("section", "Proshield", "Safekeeping para seu RH", "Matenha sua operação segura", false);
        $("app-content").append(proshieldSection[0]);
        return proshieldSection;
        
    };

    var emptyTrigger = function (args, callback) {
        if (typeof callback === 'function') {
            callback();
        }
    };

    var findAddress = function (locator) {
        if (!userScreenState.irql || !userScreenState.irql.cepcpf)
            return null;
        return $(userScreenState.irql.cepcpf).find("cep").find(locator).text();
    };

    var checkIsConfirmed = function (confirm, element) {
        return function () {
            if (!element.is(":checked")) {
                toastr.error("Você deve confirmar se os dados conferem com " + confirm + ".", "Confirme se as grafias estão corretas.");
                return false;
            }
            return true;
        };
    };

    var checkCPF = function (element) {
        return function () {
            if (!CPF.isValid(element.val())) {
                toastr.error("O CPF informado não é válido", "Verifique o documento informado");
                element.addClass("error");
                return false;
            }

            element.removeClass("error");
            return true;
        };
    };

    var checkCEP = function (element) {
        return function () {
            if (element.val().replace(/[^0-9]/, "") === "") {
                toastr.error("O CEP não informado", "Insira um CEP para continuar");
                element.addClass("error");
                return false;
            }

            element.removeClass("error");
            return true;
        };
    };

    var checkBeforeDate = function (name, element) {
        return function () {
            var mNascimento = moment(element.val(), "DD/MM/YYYY");
            if (!mNascimento.isValid() || mNascimento.diff() >= 0) {
                toastr.error("Data de " + name + " informada não é válida", "Verifique a data de " + name + " e tente novamente");
                element.addClass("error");
                return false;
            }

            element.removeClass("error");
            return true;
        };
    };

    var errorDecorator = function (fncs, noError) {
        return function () {
            var error = false;
            for (var i in fncs) {
                if (!fncs[i]())
                    error = true;
            }
            if (!error && noError)
                noError();
            return error;
        };
    };

    var emptyState = function () {
        if (userScreenState) {
            userScreenState.modal.close();
            userScreenState = null;
        }
    };

    var changeScreen = function (errorCheck, nrm, form, onSuccess, continueText, returnText) {
        returnText = returnText || controller.i18n.system.return;

        var buttonGenerator = function (name, description, nrm, beforeExec) {
            form.addSubmit(name, description).click(function (e) {
                e.preventDefault();
                if (beforeExec && beforeExec()) {
                    return;
                }
                controller.call(nrm > userScreenState.lastScreen ? userScreenState.onComplete :
                        "proshield::user::screen::" + nrm.toString(), userScreenState);
            });
        };

        continueText = continueText || (nrm + 1 > userScreenState.lastScreen ? controller.i18n.system.finish() : controller.i18n.system.continue());
        buttonGenerator("continue", continueText, nrm + 1, errorCheck);

        if (nrm < userScreenState.lastScreen && userScreenState.data.documento) {
            form.addSubmit("finish", controller.i18n.system.finish()).click(function (e) {
                e.preventDefault();
                controller.call(userScreenState.onComplete);
            });
        }

        if (nrm - 1 <= userScreenState.firstScreen) {
            form.cancelButton(null, emptyState);
        } else {
            buttonGenerator("return", returnText, nrm - 1);
        }
    };

    var checkNonEmpty = function (fieldName, field) {
        return function () {
            if (field.val().trim() === "") {
                toastr.error("O " + fieldName + " deve ser preenchido", "Preencha o " + fieldName);
                field.addClass("error");
                return false;
            }
            field.removeClass("error");
            return true;
        };
    };

    var checkEmail = function (required, element) {
        return function () {
            if (required && !checkNonEmpty("email", element)()) {
                return false;
            }

            if (element.val() !== "" && !emailRegex().test(element.val())) {
                element.addClass("error");
                toastr.error("O endereço de e-mail preenchido não é válido.", "Preencha o endereço corretamente.");
                return false;
            }
            element.removeClass("error");
            return true;
        };
    };

    var buildFormScreen = function (name, subtitle, paragraph, callback, state) {
        if (!userScreenState) {
            userScreenState = $.extend({
                modal: controller.call("modal"),
                elements: {},
                data: {},
                forms: {},
                irql: {},
                firstScreen: 1,
                lastScreen: 8,
                onComplete: "proshield::user::screen::add"
            }, state);

            userScreenState.modal.title(userScreenState.title || controller.i18n.proshield.modalTitle());
            userScreenState.elements.subtitle = userScreenState.modal.subtitle(subtitle);
            userScreenState.elements.paragraph = userScreenState.modal.addParagraph(paragraph);
        }

        userScreenState.elements.subtitle.text(subtitle);
        userScreenState.elements.paragraph.text(paragraph);

        if (userScreenState.elements.currentForm) {
            userScreenState.elements.currentForm.element().hide();
        }

        if (userScreenState.forms[name]) {
            userScreenState.elements.currentForm = userScreenState.forms[name];
            userScreenState.forms[name].element().show();
        } else {
            userScreenState.elements.currentForm = userScreenState.forms[name] = callback();
        }

    };
    
    controller.registerCall("proshield::user::screen::add", function () {
        var section = proshieldSection();
        var result = controller.call("generateResult");
    });

    controller.registerCall("proshield::user::screen::8", function (extend) {
        buildFormScreen("proshield::user::screen::8", controller.i18n.proshield.modalPhoneInformSubtitle(), controller.i18n.proshield.modalPhoneInform(), function () {
            var form = userScreenState.modal.createForm();
            var cargo = form.addInput("cargo", "text", "Cargo", true).addClass("optional").magicLabel().val(userScreenState.data.cargo),
                    cargoDescricao = form.addInput("cargoDescricao", "text", "Descrição Cargo", true).addClass("optional").magicLabel().val(userScreenState.data.cargoDescricao),
                    equipe = form.addInput("equipe", "text", "Equipe", true).addClass("optional").magicLabel().val(userScreenState.data.observacao),
                    observacao = form.addInput("observacao", "text", "Observação", true).addClass("optional").magicLabel().val(userScreenState.data.observacao);

            changeScreen(errorDecorator([], function () {
                $.extend(userScreenState.data, {
                    cargo: cargo.val(),
                    cargoDescricao: cargoDescricao.val(),
                    observacao: observacao.val(),
                    equipe: equipe.val()
                });
            }), 8, form);

            return form;
        }, extend);
    });

    controller.registerCall("proshield::user::screen::7", function (extend) {
        buildFormScreen("proshield::user::screen::7", controller.i18n.proshield.modalPhoneInformSubtitle(), controller.i18n.proshield.modalPhoneInform(), function () {
            var form = userScreenState.modal.createForm();
            var telefoneFixo = form.addInput("telefoneFixo", "text", "Telefone Fixo", true).addClass("optional").magicLabel().val(userScreenState.data.telefoneFixo),
                    telefoneCelular = form.addInput("telefoneCelular", "text", "Telefone Celular", true).addClass("optional").magicLabel().val(userScreenState.data.telefoneCelular),
                    telefoneCorporativo = form.addInput("telefoneCorporativo", "text", "Telefone Corporativo", true).addClass("optional").magicLabel().val(userScreenState.data.telefoneCorporativo);

            changeScreen(errorDecorator([], function () {
                $.extend(userScreenState.data, {
                    telefoneFixo: telefoneFixo.val(),
                    telefoneCelular: telefoneCelular.val(),
                    telefoneCorporativo: telefoneCorporativo.val()
                });
            }), 7, form);

            return form;
        }, extend);
    });

    controller.registerCall("proshield::user::screen::6", function (extend) {
        buildFormScreen("proshield::user::screen::6", controller.i18n.proshield.modalEmailInformSubtitle(), controller.i18n.proshield.modalEmailInform(), function () {
            var form = userScreenState.modal.createForm();
            var emailPessoal = form.addInput("email", "text", "E-mail Pessoal", true).addClass("optional").magicLabel().val(userScreenState.data.email),
                    emailCorporativo = form.addInput("emailCorporativo", "text", "E-mail Corporativo", true).addClass("optional").magicLabel().val(userScreenState.data.emailCorporativo);
            changeScreen(errorDecorator([
                checkEmail(false, emailPessoal),
                checkEmail(false, emailCorporativo)
            ], function () {
                $.extend(userScreenState.data, {
                    emailPessoal: emailPessoal.val(),
                    emailCorporativo: emailCorporativo.val()
                });
            }), 6, form);
            return form;
        }, extend);
    });

    controller.registerCall("proshield::user::screen::5", function (extend) {
        buildFormScreen("proshield::user::screen::5", controller.i18n.proshield.modalAddressInformSubtitle(), controller.i18n.proshield.modalAddressInform(), function () {
            var form = userScreenState.modal.createForm();

            var endereco = form.addInput("endereco", "text", "Endereço", true).attr("value", findAddress("logradouro")).magicLabel().val(userScreenState.data.endereco),
                    numero = form.addInput("numero", "text", "Número", true).magicLabel().val(userScreenState.data.numero),
                    complemento = form.addInput("complemento", "text", "Complemento", true).addClass("optional").magicLabel().val(userScreenState.data.complemento),
                    bairro = form.addInput("bairro", "text", "Bairro", true).attr("value", findAddress("bairro")).magicLabel().val(userScreenState.data.bairro);

            changeScreen(errorDecorator([
                checkNonEmpty("endereço", endereco),
                checkNonEmpty("número", numero),
                checkNonEmpty("bairro", bairro)
            ], function () {
                $.extend(userScreenState.data, {
                    endereco: endereco.val(),
                    numero: numero.val(),
                    complemento: complemento.val(),
                    bairro: bairro.val()
                });
            }), 5, form);

            return form;
        }, extend);
    });

    controller.registerCall("proshield::user::screen::4", function (extend) {
        buildFormScreen("proshield::user::screen::4", controller.i18n.proshield.modalAddressConfirmSubtitle(), controller.i18n.proshield.modalAddressConfirm(), function () {
            var form = userScreenState.modal.createForm();

            var cidade = form.addInput("cidade", "text", "Cidade", true).attr({"value": findAddress("cidade"), "readonly": "readonly"}),
                    uf = form.addInput("uf", "text", "Estado", true).attr({"value": findAddress("uf"), "readonly": "readonly"}),
                    cep = form.addInput("cep", "text", "CEP", true).attr({"value": findAddress("cep"), "readonly": "readonly"});

            var checkbox = form.addCheckbox("confirm", "Confere com o comprovante de residência?", false, "confirm");

            changeScreen(errorDecorator([
                checkIsConfirmed("o comprovante de residência", checkbox[1])
            ], function () {
                $.extend(userScreenState.data, {
                    uf: uf.val(),
                    cep: cep.val(),
                    cidade: cidade.val()
                });
            }), 4, form);

            return form;
        }, extend);
    });

    controller.registerCall("proshield::user::screen::3", function (extend) {
        buildFormScreen("proshield::user::screen::3", controller.i18n.proshield.modalRGInformSubtitle(), controller.i18n.proshield.modalRGInform(), function () {
            var form = userScreenState.modal.createForm();

            var rg = form.addInput("rg", "text", "Número do RG", true).magicLabel().val(userScreenState.data.rg),
                    rgEstado = form.addSelect("uf", "Emissão", {
                        "": "Selecione o Estado Emissor",
                        "AC": "Acre", "AL": "Alagoas", "AM": "Amazonas",
                        "AP": "Amapá", "BA": "Bahia", "CE": "Ceará",
                        "DF": "Distrito Federal", "ES": "Espírito Santo",
                        "GO": "Goiás", "MA": "Maranhão", "MT": "Mato Grosso",
                        "MS": "Mato Grosso do Sul", "MG": "Minas Gerais",
                        "PA": "Pará", "PB": "Paraíba", "PR": "Paraná",
                        "PE": "Pernambuco", "PI": "Piauí", "RJ": "Rio de Janeiro",
                        "RN": "Rio Grande do Norte", "RO": "Rondônia",
                        "RS": "Rio Grande do Sul", "RR": "Roraima",
                        "SC": "Santa Catarina", "SE": "Sergipe",
                        "SP": "São Paulo", "TO": "Tocantins"
                    }, true, "Estado Emissor").magicLabel(),
                    rgEmissao = form.addInput("emissao", "text", "Data de Emissão", true).mask("99/99/9999").magicLabel().val(userScreenState.data.rgEmissao);

            changeScreen(errorDecorator([
                checkNonEmpty("RG", rg),
                checkNonEmpty("estado emissor", rgEstado),
                checkBeforeDate("emissão", rgEmissao)
            ], function () {
                $.extend(userScreenState.data, {
                    rg: rg.val(),
                    rgEstado: rgEstado.val(),
                    rgEmissao: rgEmissao.val()
                });
            }), 3, form);
            return form;
        }, extend);
    });

    controller.registerCall("proshield::user::screen::2::valid", function (extend) {
        buildFormScreen("proshield::user::screen::2", controller.i18n.proshield.modalNameConfirmSubtitle(), controller.i18n.proshield.modalNameConfirm(), function () {
            var form = userScreenState.modal.createForm(),
                    irqlNome = $(userScreenState.irql.cepcpf).find("nome").text(),
                    nome, confirmName = null;

            if (irqlNome) {
                nome = form.addInput("name", "text", "").attr({
                    "readonly": "readonly",
                    "value": irqlNome
                }).addClass("input-confirm");
                confirmName = form.addCheckbox("confirm", "Confere com o documento.", false, "confirm");
            } else {
                nome = form.addInput("name", "text", "Nome Completo", true, "Nome").magicLabel();
            }

            var mae = form.addInput("mother", "text", "Nome Completo da Mãe", true, "Nome Mãe").magicLabel().val(userScreenState.data.mae),
                    pai = form.addInput("father", "text", "Nome Completo do Pai", true, "Nome Pai").magicLabel().val(userScreenState.data.pai);


            var errors = [
                checkNonEmpty("nome", nome),
                checkNonEmpty("nome do pai", pai),
                checkNonEmpty("nome da mãe", mae)
            ];

            if (confirmName)
                errors.push(checkIsConfirmed("o documento", confirmName[1]));

            changeScreen(errorDecorator(errors, function () {
                $.extend(userScreenState.data, {
                    nome: nome.val(),
                    mae: mae.val(),
                    pai: pai.val()
                });
            }), 2, form);

            return form;
        }, extend);
    });

    controller.registerCall("proshield::user::screen::2", function (extend) {
        controller.serverCommunication.call(null,
                controller.call("error::ajax", {
                    data: $.extend({}, userScreenState.data, {
                        "q[0]": "SELECT FROM 'RFB'.'CERTIDAO'",
                        "q[1]": "SELECT FROM 'BIPBOPJS'.'CEP'"
                    }),
                    automaticLoader: true,
                    success: function (irql) {
                        userScreenState.irql.cepcpf = irql;
                        controller.call("proshield::user::screen::2::valid", extend);
                    },
                    error: function (xhr) {
                        var exceptions = $(xhr.responseText).find("exception");
                        if (!exceptions.length || exceptions.attr("code") === '99') {
                            /* Ambiente indisponível ;( */
                            controller.call("proshield::user::screen::2::valid");
                            return;
                        }
                    }
                }));
    });

    controller.registerCall("proshield::user::screen::1", function (extend) {
        buildFormScreen("proshield::user::screen::1", controller.i18n.proshield.modalSubtitle(), controller.i18n.proshield.modalMessage(), function () {
            var form = userScreenState.modal.createForm();
            var cpf = form.addInput("cpf", "text", controller.i18n.proshield.cpfInput(), true, "CPF").mask("999.999.999-99").magicLabel().val(userScreenState.data.cpf),
                    cep = form.addInput("cep", "text", controller.i18n.proshield.cepInput(), true, "CEP").mask("99.999-999").magicLabel().val(userScreenState.data.cep),
                    nascimento = form.addInput("nascimento", "text", controller.i18n.proshield.birthdayInput(), true, "Data de Nascimento").magicLabel().mask("99/99/9999").val(userScreenState.data.nascimento);

            changeScreen(errorDecorator([
                checkBeforeDate("nascimento", nascimento),
                checkCEP(cep),
                checkCPF(cpf)
            ], function () {
                $.extend(userScreenState.data, {
                    documento: cpf.val(),
                    nascimento: nascimento.val(),
                    cep: cep.val().replace(/[^0-9]/, "")
                });
            }), 1, form);

            return form;
        }, extend);
    });

    controller.registerTrigger("findDatabase::instantSearch", "proshield::instantSearch", function (args, callback) {
        callback();

        var validCpf = CPF.isValid(args[0]);

        if (validCpf || SEARCH_REGEX.test(args[0])) {
            args[1].item("ProShield", "Consultar CPF").addClass("proshield").click(function (e) {
                e.preventDefault();
                controller.call("proshield::user::screen::1", validCpf ? args[0] : null);
            });
        }
    });

    controller.registerCall("proshield::stylish", function () {
        controller.interface.addCSSDocument("css/proshield.min.css");
    });


    controller.call("proshield::stylish");
})(harlan);