document.addEventListener('DOMContentLoaded', () => {
    const budgetForm = document.getElementById('budget-form');
    if (budgetForm) {
        budgetForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const pecas = {};
            document.querySelectorAll('#pecas-list li').forEach(item => { pecas[item.dataset.description] = parseFloat(item.dataset.value); });
            document.getElementById('pecas_json').value = JSON.stringify(pecas);

            const maoObra = {};
            document.querySelectorAll('#mo-list li').forEach(item => { maoObra[item.dataset.description] = parseFloat(item.dataset.value); });
            document.getElementById('mao_obra_json').value = JSON.stringify(maoObra);
            
            const formData = new FormData(budgetForm);
            const submitButton = budgetForm.querySelector('button[type="submit"]');
            
            submitButton.disabled = true;
            submitButton.textContent = 'Gerando...';

            try {
                const response = await fetch('/generate', {
                    method: 'POST',
                    body: formData,
                });
                const result = await response.json();
                if (result.success) {
                    const pdfUrl = `/data/${result.file}`;
                    window.open(pdfUrl, '_blank');
                } else {
                    alert(`Erro ao gerar PDF: ${result.error || 'Erro desconhecido.'}`);
                }
            } catch (error) {
                alert(`Erro de comunicação com o servidor: ${error.message}`);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Gerar e Baixar PDF';
            }
        });
    }

    function addItem(listId, descId, valueId) {
        const list = document.getElementById(listId);
        const descInput = document.getElementById(descId);
        const valueInput = document.getElementById(valueId);
        const description = descInput.value.trim();
        const value = parseFloat(valueInput.value);

        if (description && !isNaN(value) && value >= 0) {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
            listItem.dataset.description = description;
            listItem.dataset.value = value.toFixed(2);
            listItem.innerHTML = `<span>${description} - R$ ${value.toFixed(2)}</span><button type="button" class="btn-close" aria-label="Close"></button>`;
            list.appendChild(listItem);
            descInput.value = '';
            valueInput.value = '';
            listItem.querySelector('.btn-close').addEventListener('click', () => listItem.remove());
        } else {
            alert('Por favor, preencha a descrição e um valor válido.');
        }
    }

    document.getElementById('add-peca-btn')?.addEventListener('click', () => addItem('pecas-list', 'peca-desc', 'peca-valor'));
    document.getElementById('add-mo-btn')?.addEventListener('click', () => addItem('mo-list', 'mo-desc', 'mo-valor'));
});
// Adicione este bloco no final do arquivo script.js

document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            // No Desktop, ele adiciona uma classe no body para encolher o conteúdo
            if (window.innerWidth > 992) {
                document.body.classList.toggle('sidebar-closed');
            } else {
                // No mobile, ele mostra/esconde a sidebar
                sidebar.classList.toggle('active');
            }
        });
    }
});