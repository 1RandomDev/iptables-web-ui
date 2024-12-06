const toastContainer = document.getElementById('toastContainer');
function showError(message) {
    showToast({
        message: '<b>An internal error occoured:</b><br>'+message.replace('\n', '<br>'),
        type: 'danger',
        width: '500px'
    });
}
function showToast(data) {
    let toastElement = document.createElement('template');
    toastElement.innerHTML =
        `<div class="toast align-items-center border-0 mb-2 text-bg-${data.type || 'secondary'}">
            <div class="d-flex">
                <div class="toast-body">
                    ${data.message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>`;
    toastElement = toastElement.content.firstChild;
    if(data.width) toastElement.style.width = data.width;
    toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
    toastContainer.appendChild(toastElement);
    new bootstrap.Toast(toastElement).show();
}
function showModal(data) {
    return new Promise(resolve => {
        let modalElement = document.createElement('template');
        modalElement.innerHTML =
        `<div class="modal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${data.title}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">${data.body}</div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-${data.type || 'primary'} acceptBtn">${data.acceptText || 'Confirm'}</button>
                </div>
                </div>
            </div>
        </div>`;
        modalElement = modalElement.content.firstChild;
        const modal = new bootstrap.Modal(modalElement), acceptBtn = modalElement.querySelector('.acceptBtn');
        document.body.appendChild(modalElement);
        if(data.onInit) data.onInit({modal, modalElement, acceptBtn});

        acceptBtn.addEventListener('click', () => {
            const status = {accept: true, inputs: {}};
            modalElement.querySelectorAll('.modal-body input[name]').forEach(input => {
                status.inputs[input.name] = input.value;
            });
            resolve(status);
            modal.hide();
        });
        modalElement.addEventListener('hidden.bs.modal', () => {
            modalElement.remove();
            resolve({accept: false});
        });
        modal.show();
    });
}